/**
 * Self-contained Draw.io XML -> OOXML/PPTX cell parser & SVG rasterizer.
 * Extracted locally into blogs/scripts/lib/ with zero external sibling coupling.
 */
import { XMLParser } from 'fast-xml-parser';

export interface ParsedMxCell {
  id: string;
  value: string;
  style: Record<string, string>;
  vertex: boolean;
  edge: boolean;
  parent: string;
  source?: string;
  target?: string;
  sourcePoint?: { x: number; y: number };
  targetPoint?: { x: number; y: number };
  x: number;
  y: number;
  width: number;
  height: number;
  absX: number;
  absY: number;
  depth: number;
  waypoints: { x: number; y: number }[];
  extractedSvgs: string[];
  imageDataUrl?: string;
  htmlTitleColor?: string;
  htmlSubtitleColor?: string;
}

function parseStyleString(styleStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!styleStr) return result;
  const protectedStr = styleStr
    .replace(/data:([^;]+);base64,/g, 'data:$1__SEMI_BASE64__')
    .replace(/data:([^;]+);utf8,/g, 'data:$1__SEMI_UTF8__');
  const parts = protectedStr.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
      result[trimmed] = '1';
    } else {
      const k = trimmed.substring(0, eqIdx).trim();
      const v = trimmed
        .substring(eqIdx + 1)
        .trim()
        .replace(/__SEMI_BASE64__/g, ';base64,')
        .replace(/__SEMI_UTF8__/g, ';utf8,');
      result[k] = v;
    }
  }
  return result;
}

function decodeStyleImageToSvg(styleImage?: string): string | null {
  if (!styleImage) return null;
  try {
    if (styleImage.startsWith('data:image/svg+xml;base64,')) {
      const b64 = styleImage.substring('data:image/svg+xml;base64,'.length);
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return decodeURIComponent(escape(window.atob(b64)));
      } else if (typeof Buffer !== 'undefined') {
        return Buffer.from(b64, 'base64').toString('utf-8');
      }
    } else if (styleImage.startsWith('data:image/svg+xml;utf8,')) {
      return decodeURIComponent(styleImage.substring('data:image/svg+xml;utf8,'.length));
    } else if (styleImage.startsWith('data:image/svg+xml,')) {
      return decodeURIComponent(styleImage.substring('data:image/svg+xml,'.length));
    }
  } catch (e) {
    console.warn('Failed to decode style.image SVG:', e);
  }
  return null;
}

/**
 * Normalizes Draw.io HTML before text extraction so that:
 * 1. Multi-line `<br/>` tags inside `<b>...</b>` or `<strong>...</strong>` are collapsed into spaces
 *    (preventing wrapped bold titles from splitting into title + subtitle).
 * 2. Adjacent `</b><span` or `</strong><span` tags without an intervening `<br/>` receive an explicit `<br/>`
 *    (preventing run-on concatenation such as "Competing B2B TenantsFinVault...").
 */
export function normalizeDrawioHtmlForSlides(rawHtml: string | undefined): string {
  if (!rawHtml) return '';
  const decoded = rawHtml
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return decoded
    .replace(/<b\b([^>]*)>([\s\S]*?)<\/b>/gi, (_m, attrs, inner) => {
      const flat = String(inner).replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
      return `<b${attrs}>${flat}</b>`;
    })
    .replace(/<strong\b([^>]*)>([\s\S]*?)<\/strong>/gi, (_m, attrs, inner) => {
      const flat = String(inner).replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
      return `<strong${attrs}>${flat}</strong>`;
    })
    .replace(/<\/b>\s*(?!<br\b)(<span\b|<div\b|<font\b)/gi, '</b><br/>$1')
    .replace(/<\/strong>\s*(?!<br\b)(<span\b|<div\b|<font\b)/gi, '</strong><br/>$1');
}

function extractHtmlColorsAndSvgs(
  html: string,
  styleImage?: string
): {
  svgs: string[];
  titleColor?: string;
  subtitleColor?: string;
} {
  const svgs: string[] = [];

  // 1. Check style.image first (used by Azure Landing Zone & GCP stencils)
  const decodedStyleSvg = decodeStyleImageToSvg(styleImage);
  if (decodedStyleSvg && decodedStyleSvg.includes('<svg')) {
    svgs.push(decodedStyleSvg);
  }

  if (!html) return { svgs };
  const decoded = normalizeDrawioHtmlForSlides(html);

  const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
  let match;
  while ((match = svgRegex.exec(decoded)) !== null) {
    const candidate = match[0];
    if (!/display\s*:\s*none/i.test(candidate) && !/width\s*=\s*["']0["']/i.test(candidate)) {
      svgs.push(candidate);
    }
  }

  const imgDataRegex = /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgDataRegex.exec(decoded)) !== null) {
    if (imgMatch[1]) {
      svgs.push(imgMatch[1]);
    }
  }

  const withoutSvg = decoded
    .replace(svgRegex, '')
    .replace(imgDataRegex, '')
    .replace(/<span[^>]*border-radius\s*:\s*(?:50%|999\d*px)[^>]*>[\s\S]*?<\/span>/gi, '');
  const colorMatches: string[] = [];
  const cssColorRegex = /(?:^|[;"'\s])color\s*:\s*(#[0-9a-fA-F]{3,6})/gi;
  let cm;
  while ((cm = cssColorRegex.exec(withoutSvg)) !== null) {
    let hex = cm[1].replace('#', '').trim().toUpperCase();
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (/^[0-9A-F]{6}$/.test(hex)) {
      colorMatches.push(hex);
    }
  }

  return {
    svgs,
    titleColor: colorMatches[0],
    subtitleColor: colorMatches[1] || colorMatches[0],
  };
}

export function cleanHtmlToPlainText(html: string): {
  title: string;
  subtitle: string;
  fullText: string;
  lines: string[];
} {
  if (!html) return { title: '', subtitle: '', fullText: '', lines: [] };
  const decoded = normalizeDrawioHtmlForSlides(html);

  // Remove inline <svg>...</svg> blocks completely so SVG paths don't leak into text
  const noSvg = decoded.replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // Format circular/pill step badges (<span style="...border-radius:50%...">1</span>) with a clean ". " separator
  const withFormattedStepBadges = noSvg.replace(
    /<span[^>]*border-radius\s*:\s*(?:50%|999\d*px)[^>]*>\s*([0-9A-Za-z]+)\s*<\/span>\s*/gi,
    '$1. '
  );

  // Replace block tags, table rows, and line breaks with newlines
  const withNewlines = withFormattedStepBadges
    .replace(/<\/td>\s*<td[^>]*>/gi, ' ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/span>\s*<span/gi, '</span> <span')
    .replace(/<[^>]+>/g, '');

  const lines = withNewlines
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { title: '', subtitle: '', fullText: '', lines: [] };
  }

  // Merge wrapped multi-line titles ending in ",", "&", "/", or "-" (e.g., "GCP Observability,\nAgentOps & FinOps")
  if (lines.length >= 2 && /[,&/\-]$/.test(lines[0])) {
    const mergedTitle = `${lines[0]} ${lines[1]}`.replace(/\s+/g, ' ').trim();
    const rest = lines.slice(2);
    const mergedLines = [mergedTitle, ...rest];
    return {
      title: mergedTitle,
      subtitle: rest.join(' • '),
      fullText: mergedLines.join('\n'),
      lines: mergedLines,
    };
  }

  const title = lines[0];
  const subtitle = lines.slice(1).join(' • ');
  const fullText = lines.join('\n');
  return { title, subtitle, fullText, lines };
}

function normalizeHexColor(colorStr: string | undefined, fallback: string): string {
  if (!colorStr || colorStr === 'none' || colorStr === 'transparent') return fallback;
  let clean = colorStr.replace('#', '').trim().toUpperCase();
  if (clean.length === 3) {
    clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
  }
  if (/^[0-9A-F]{6}$/.test(clean)) {
    return clean;
  }
  return fallback;
}

function isDarkColor(hex: string): boolean {
  const clean = normalizeHexColor(hex, 'FFFFFF');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.52;
}

function normalizeSvgDimensions(svgStr: string, widthPx: number, heightPx: number): string {
  let clean = svgStr.trim();
  if (clean.startsWith('data:image/svg+xml')) {
    const commaIdx = clean.indexOf(',');
    if (commaIdx !== -1) {
      const header = clean.slice(0, commaIdx);
      const payload = clean.slice(commaIdx + 1);
      if (header.includes('base64')) {
        clean = typeof Buffer !== 'undefined'
          ? Buffer.from(payload, 'base64').toString('utf-8')
          : atob(payload);
      } else {
        try {
          clean = decodeURIComponent(payload);
        } catch {
          clean = payload;
        }
      }
    }
  }
  if (clean.includes('&lt;svg') || clean.includes('&quot;') || clean.includes('&amp;')) {
    clean = clean
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }
  if (!clean.includes('xmlns=')) {
    clean = clean.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  clean = clean.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
    const cleanedAttrs = attrs
      .replace(/\s+width=["'][^"']*["']/gi, '')
      .replace(/\s+height=["'][^"']*["']/gi, '');
    return `<svg width="${widthPx}" height="${heightPx}"${cleanedAttrs}>`;
  });
  return clean;
}

/**
 * Renders an inline <svg> string OR data:image URL into a high-resolution transparent PNG data URL
 * so PowerPoint / Google Slides can display crisp vector icons on every card.
 */
export async function renderInlineSvgToPngDataUrl(
  svgOrDataUrl: string,
  widthPx: number = 128,
  heightPx: number = 128
): Promise<string | null> {
  if (!svgOrDataUrl) return null;
  const trimmedInput = svgOrDataUrl.trim();
  if (trimmedInput.startsWith('data:image/png') || trimmedInput.startsWith('data:image/jpeg')) {
    return trimmedInput;
  }

  if (typeof window === 'undefined') {
    const nodeDynamicImport = async (modName: string) => {
      try {
        return await new Function('m', 'return import(m)')(modName);
      } catch {
        const req = new Function('return typeof require !== "undefined" ? require : null')();
        if (req) return req(modName);
        const { createRequire } = await import(/* webpackIgnore: true */ 'module');
        return createRequire(process.cwd() + '/package.json')(modName);
      }
    };
    const cleanSvg = normalizeSvgDimensions(trimmedInput, widthPx, heightPx);
    try {
      const sharpMod = await nodeDynamicImport('sharp');
      const sharpFn = sharpMod.default || sharpMod;
      const svgBuf = Buffer.from(cleanSvg, 'utf-8');
      const pngBuf = await sharpFn(svgBuf).resize(widthPx, heightPx).png().toBuffer();
      return `data:image/png;base64,${pngBuf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    try {
      let url = '';
      let shouldRevoke = false;

      if (svgOrDataUrl.startsWith('data:image/png') || svgOrDataUrl.startsWith('data:image/jpeg')) {
        url = svgOrDataUrl;
      } else {
        const cleanSvg = normalizeSvgDimensions(svgOrDataUrl, widthPx, heightPx);
        const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
        url = URL.createObjectURL(svgBlob);
        shouldRevoke = true;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = widthPx;
          canvas.height = heightPx;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, widthPx, heightPx);
            ctx.drawImage(img, 0, 0, widthPx, heightPx);
            const dataUrl = canvas.toDataURL('image/png');
            if (shouldRevoke) URL.revokeObjectURL(url);
            resolve(dataUrl);
            return;
          }
        } catch (err) {
          console.warn('SVG canvas draw error:', err);
        }
        if (shouldRevoke) URL.revokeObjectURL(url);
        resolve(null);
      };

      img.onerror = () => {
        if (shouldRevoke) URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

export function parseDrawioXmlForPptx(xmlContent: string): {
  cells: ParsedMxCell[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  isDarkDiagram: boolean;
  diagramBgHex: string;
} {
  const cellMap = new Map<string, ParsedMxCell>();
  let detectedBgHex = '';

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');
    const graphModel = doc.querySelector('mxGraphModel');
    const modelBgAttr = graphModel?.getAttribute('background');
    if (modelBgAttr) detectedBgHex = normalizeHexColor(modelBgAttr, 'F8FAFC');

    const rawCells = Array.from(doc.getElementsByTagName('mxCell'));
    for (const el of rawCells) {
      const id = el.getAttribute('id') || '';
      if (id === '0' || id === '1') continue;

      const value = el.getAttribute('value') || '';
      const styleStr = el.getAttribute('style') || '';
      const style = parseStyleString(styleStr);
      const vertex = el.getAttribute('vertex') === '1';
      const edge = el.getAttribute('edge') === '1';
      const parent = el.getAttribute('parent') || '1';
      const source = el.getAttribute('source') || undefined;
      const target = el.getAttribute('target') || undefined;

      let x = 0;
      let y = 0;
      let width = 0;
      let height = 0;
      let sourcePoint: { x: number; y: number } | undefined;
      let targetPoint: { x: number; y: number } | undefined;
      const waypoints: { x: number; y: number }[] = [];

      const geo = el.getElementsByTagName('mxGeometry')[0];
      if (geo) {
        x = parseFloat(geo.getAttribute('x') || '0');
        y = parseFloat(geo.getAttribute('y') || '0');
        width = parseFloat(geo.getAttribute('width') || '0');
        height = parseFloat(geo.getAttribute('height') || '0');

        const childPoints = Array.from(geo.getElementsByTagName('mxPoint'));
        for (const pt of childPoints) {
          const asAttr = pt.getAttribute('as');
          const px = parseFloat(pt.getAttribute('x') || '0');
          const py = parseFloat(pt.getAttribute('y') || '0');
          if (asAttr === 'sourcePoint') {
            sourcePoint = { x: px, y: py };
          } else if (asAttr === 'targetPoint') {
            targetPoint = { x: px, y: py };
          } else if (!asAttr && !isNaN(px) && !isNaN(py)) {
            waypoints.push({ x: px, y: py });
          }
        }
      }

      if (vertex && width >= 700 && height >= 400 && style.fillColor && style.fillColor !== 'none') {
        const candidateHex = normalizeHexColor(style.fillColor, 'FFFFFF');
        if (!detectedBgHex) {
          detectedBgHex = candidateHex;
        }
      }

      const { svgs, titleColor, subtitleColor } = extractHtmlColorsAndSvgs(value, style.image);

      cellMap.set(id, {
        id,
        value,
        style,
        vertex,
        edge,
        parent,
        source,
        target,
        sourcePoint,
        targetPoint,
        x,
        y,
        width,
        height,
        absX: x,
        absY: y,
        depth: 0,
        waypoints,
        extractedSvgs: svgs,
        imageDataUrl: style.image,
        htmlTitleColor: titleColor,
        htmlSubtitleColor: subtitleColor,
      });
    }
  } else {
    // Node.js server / CLI quality gate parser using fast-xml-parser
    const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsedObj = xmlParser.parse(xmlContent);
    const diagramNode = parsedObj?.mxfile?.diagram || parsedObj?.diagram || parsedObj;
    const graphModel = diagramNode?.mxGraphModel || parsedObj?.mxGraphModel || diagramNode;
    const modelBgAttr = graphModel?.['@_background'];
    if (modelBgAttr) detectedBgHex = normalizeHexColor(modelBgAttr, 'F8FAFC');

    const rootNode = graphModel?.root || graphModel;
    const rawCellsObj = rootNode?.mxCell || [];
    const rawCells = Array.isArray(rawCellsObj) ? rawCellsObj : [rawCellsObj];

    for (const el of rawCells) {
      if (!el) continue;
      const id = String(el['@_id'] || '');
      if (id === '0' || id === '1') continue;

      const value = String(el['@_value'] || '');
      const styleStr = String(el['@_style'] || '');
      const style = parseStyleString(styleStr);
      const vertex = String(el['@_vertex']) === '1';
      const edge = String(el['@_edge']) === '1';
      const parent = String(el['@_parent'] || '1');
      const source = el['@_source'] ? String(el['@_source']) : undefined;
      const target = el['@_target'] ? String(el['@_target']) : undefined;

      let x = 0;
      let y = 0;
      let width = 0;
      let height = 0;
      let sourcePoint: { x: number; y: number } | undefined;
      let targetPoint: { x: number; y: number } | undefined;
      const waypoints: { x: number; y: number }[] = [];

      const geo = el.mxGeometry;
      if (geo) {
        x = parseFloat(geo['@_x'] || '0');
        y = parseFloat(geo['@_y'] || '0');
        width = parseFloat(geo['@_width'] || '0');
        height = parseFloat(geo['@_height'] || '0');

        const directPts = geo.mxPoint ? (Array.isArray(geo.mxPoint) ? geo.mxPoint : [geo.mxPoint]) : [];
        const arrayPts = geo.Array?.mxPoint
          ? Array.isArray(geo.Array.mxPoint)
            ? geo.Array.mxPoint
            : [geo.Array.mxPoint]
          : [];
        const pts = [...directPts, ...arrayPts];
        for (const pt of pts) {
          if (!pt) continue;
          const asAttr = pt['@_as'];
          const px = parseFloat(pt['@_x'] || '0');
          const py = parseFloat(pt['@_y'] || '0');
          if (asAttr === 'sourcePoint') {
            sourcePoint = { x: px, y: py };
          } else if (asAttr === 'targetPoint') {
            targetPoint = { x: px, y: py };
          } else if (!asAttr && !isNaN(px) && !isNaN(py)) {
            waypoints.push({ x: px, y: py });
          }
        }
      }

      if (vertex && width >= 700 && height >= 400 && style.fillColor && style.fillColor !== 'none') {
        const candidateHex = normalizeHexColor(style.fillColor, 'FFFFFF');
        if (!detectedBgHex) {
          detectedBgHex = candidateHex;
        }
      }

      const { svgs, titleColor, subtitleColor } = extractHtmlColorsAndSvgs(value, style.image);

      cellMap.set(id, {
        id,
        value,
        style,
        vertex,
        edge,
        parent,
        source,
        target,
        sourcePoint,
        targetPoint,
        x,
        y,
        width,
        height,
        absX: x,
        absY: y,
        depth: 0,
        waypoints,
        extractedSvgs: svgs,
        imageDataUrl: style.image,
        htmlTitleColor: titleColor,
        htmlSubtitleColor: subtitleColor,
      });
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const cells: ParsedMxCell[] = [];
  for (const cell of cellMap.values()) {
    let parentOffsetX = 0;
    let parentOffsetY = 0;
    let depth = 0;
    let pId = cell.parent;

    while (pId && pId !== '1' && pId !== '0') {
      const parentCell = cellMap.get(pId);
      if (!parentCell) break;
      parentOffsetX += parentCell.x;
      parentOffsetY += parentCell.y;
      depth += 1;
      pId = parentCell.parent;
    }

    cell.absX = cell.x + parentOffsetX;
    cell.absY = cell.y + parentOffsetY;
    cell.depth = depth;

    if (parentOffsetX !== 0 || parentOffsetY !== 0) {
      if (cell.sourcePoint) {
        cell.sourcePoint = {
          x: cell.sourcePoint.x + parentOffsetX,
          y: cell.sourcePoint.y + parentOffsetY,
        };
      }
      if (cell.targetPoint) {
        cell.targetPoint = {
          x: cell.targetPoint.x + parentOffsetX,
          y: cell.targetPoint.y + parentOffsetY,
        };
      }
      if (cell.waypoints && cell.waypoints.length > 0) {
        cell.waypoints = cell.waypoints.map((wp) => ({
          x: wp.x + parentOffsetX,
          y: wp.y + parentOffsetY,
        }));
      }
    }

    cells.push(cell);

    if (cell.vertex && (cell.width > 0 || cell.height > 0)) {
      minX = Math.min(minX, cell.absX);
      minY = Math.min(minY, cell.absY);
      maxX = Math.max(maxX, cell.absX + cell.width);
      maxY = Math.max(maxY, cell.absY + cell.height);
    }
    if (cell.edge) {
      if (cell.sourcePoint) {
        minX = Math.min(minX, cell.sourcePoint.x);
        minY = Math.min(minY, cell.sourcePoint.y);
        maxX = Math.max(maxX, cell.sourcePoint.x);
        maxY = Math.max(maxY, cell.sourcePoint.y);
      }
      if (cell.targetPoint) {
        minX = Math.min(minX, cell.targetPoint.x);
        minY = Math.min(minY, cell.targetPoint.y);
        maxX = Math.max(maxX, cell.targetPoint.x);
        maxY = Math.max(maxY, cell.targetPoint.y);
      }
    }
  }

  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 1280;
    maxY = 760;
  }

  const finalBgHex = detectedBgHex || 'FFFFFF';
  const isDarkDiagram = isDarkColor(finalBgHex);

  return { cells, minX, minY, maxX, maxY, isDarkDiagram, diagramBgHex: finalBgHex };
}

function getImageDimensionsFromDataUri(dataUrl: string): { width: number; height: number } | null {
  try {
    const base64Idx = dataUrl.indexOf(';base64,');
    if (base64Idx === -1) return null;
    const b64 = dataUrl.substring(base64Idx + 8);
    let bytes: Uint8Array;
    if (typeof Buffer !== 'undefined') {
      bytes = Buffer.from(b64, 'base64');
    } else if (typeof atob !== 'undefined') {
      const binStr = atob(b64.slice(0, 1024));
      bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    } else {
      return null;
    }

    // PNG signature: 89 50 4E 47
    if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
      const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | (bytes[23])) >>> 0;
      if (width > 0 && height > 0) return { width, height };
    }

    // JPEG signature: FF D8
    if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset < bytes.length - 8) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker >= 0xc0 && marker <= 0xc2) {
          const height = (bytes[offset + 5] << 8) | bytes[offset + 6];
          const width = (bytes[offset + 7] << 8) | bytes[offset + 8];
          if (width > 0 && height > 0) return { width, height };
        }
        const len = (bytes[offset + 2] << 8) | bytes[offset + 3];
        offset += 2 + len;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export const CIRCLED_STEP_DIGITS: Record<string, string> = {
  '1': '❶',
  '2': '❷',
  '3': '❸',
  '4': '❹',
  '5': '❺',
  '6': '❻',
  '7': '➐',
  '8': '➑',
  '9': '➒',
  '10': '➓',
};

interface StructuredIconRow {
  iconSvg?: string;
  title: string;
  subtitle?: string;
  titleColor?: string;
  subtitleColor?: string;
}

interface StructuredInlineSpan {
  text: string;
  color?: string;
  bold?: boolean;
  isSmall?: boolean;
}

export interface StructuredNodeLayout {
  kind: 'multi-row-icon-list' | 'table-card' | 'standard';
  stepBadge?: { num: string; bgHex: string };
  leftIconSvg?: string;
  rightIconSvg?: string;
  headerLines: string[];
  bodyLines: { text: string; color?: string; bold?: boolean }[];
  inlineSpans?: StructuredInlineSpan[];
  iconRows?: StructuredIconRow[];
  textAlign?: 'left' | 'center' | 'right';
}

function extractFirstCssColor(fragment: string): string | undefined {
  const m = fragment.match(/(?:^|[;"'\s])color\s*:\s*(#[0-9a-fA-F]{3,6})/i);
  if (!m) return undefined;
  return normalizeHexColor(m[1], '');
}

function stripTagsToLines(fragment: string): string[] {
  return normalizeDrawioHtmlForSlides(fragment)
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/span>\s*<span/gi, '</span> <span')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function extractStructuredNodeLayout(rawHtml: string): StructuredNodeLayout {
  const decoded = normalizeDrawioHtmlForSlides(rawHtml).replace(
    /<svg[^>]*(?:display\s*:\s*none|width\s*=\s*["']0["'])[^>]*>[\s\S]*?<\/svg>/gi,
    ''
  );
  if (!decoded.trim()) {
    return { kind: 'standard', headerLines: [], bodyLines: [] };
  }

  // 1. Extract circular step badge (<span style="...background:#1D4ED8...border-radius:50%...">1</span>)
  let stepBadge: { num: string; bgHex: string } | undefined;
  const badgeTagRegex =
    /<span([^>]*border-radius\s*:\s*(?:50%|999\d*px)[^>]*)>\s*([0-9A-Za-z]+)\s*<\/span>\s*/i;
  const badgeMatch = decoded.match(badgeTagRegex);
  if (badgeMatch) {
    const attrs = badgeMatch[1] || '';
    const num = badgeMatch[2].trim();
    const bgMatch = attrs.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6})/i);
    const bgHex = normalizeHexColor(bgMatch ? bgMatch[1] : '1D4ED8', '1D4ED8');
    stepBadge = { num, bgHex };
  }

  const withoutBadge = decoded.replace(
    /<span[^>]*border-radius\s*:\s*(?:50%|999\d*px)[^>]*>\s*[0-9A-Za-z]+\s*<\/span>\s*/gi,
    ''
  );

  // 2. Check for <table> layout (multi-row icon list like Observability OR single-row compactNodeHtml card)
  const tableMatch = withoutBadge.match(/<table[\s\S]*?<\/table>/i);
  if (tableMatch && tableMatch.index !== undefined) {
    const preTableHtml = withoutBadge.slice(0, tableMatch.index);
    const tableHtml = tableMatch[0];
    const trMatches = Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));

    if (trMatches.length >= 2) {
      const iconRows: StructuredIconRow[] = [];
      for (const tr of trMatches) {
        const trBody = tr[1];
        const svgMatch = trBody.match(/<svg[\s\S]*?<\/svg>/i);
        const imgMatch = trBody.match(/<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/i);
        const lines = stripTagsToLines(trBody);
        if (lines.length > 0) {
          iconRows.push({
            iconSvg: svgMatch ? svgMatch[0] : imgMatch ? imgMatch[1] : undefined,
            title: lines[0],
            subtitle: lines.slice(1).join(' '),
          });
        }
      }
      if (iconRows.some((r) => Boolean(r.iconSvg))) {
        const headerLines = stripTagsToLines(preTableHtml);
        return {
          kind: 'multi-row-icon-list',
          stepBadge,
          headerLines,
          bodyLines: [],
          iconRows,
        };
      }
    }

    if (trMatches.length === 1) {
      const trBody = trMatches[0][1];
      const tdMatches = Array.from(trBody.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi));
      if (tdMatches.length >= 1) {
        const parsedTds = tdMatches.map((td) => {
          const attrs = td[1] || '';
          const content = normalizeDrawioHtmlForSlides(td[2] || '');
          const svgM = content.match(/<svg[\s\S]*?<\/svg>/i);
          const imgM = content.match(/<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/i);
          const lines = stripTagsToLines(content);
          const divMatches = Array.from(content.matchAll(/<div\b([^>]*)>([\s\S]*?)<\/div>/gi));
          const richLines: { text: string; color?: string; bold?: boolean }[] = [];
          if (divMatches.length > 0) {
            for (const dm of divMatches) {
              const dAttrs = dm[1] || '';
              const dText = stripTagsToLines(dm[2] || '').join(' ');
              if (!dText) continue;
              const dColor = extractFirstCssColor(dAttrs) || extractFirstCssColor(dm[2] || '');
              const isBold = /font-weight\s*:\s*(?:bold|[6789]00)/i.test(dAttrs);
              richLines.push({ text: dText, color: dColor, bold: isBold });
            }
          } else {
            lines.forEach((l, idx) => richLines.push({ text: l, bold: idx === 0 }));
          }
          const alignMatch = attrs.match(/text-align\s*:\s*(left|center|right)/i);
          return {
            svg: svgM ? svgM[0] : imgM ? imgM[1] : undefined,
            hasText: richLines.length > 0,
            richLines,
            align: alignMatch ? (alignMatch[1].toLowerCase() as 'left' | 'center' | 'right') : undefined,
          };
        });

        let leftIconSvg: string | undefined;
        let rightIconSvg: string | undefined;
        const textTd = parsedTds.find((t) => t.hasText) || parsedTds[0];

        if (parsedTds.length >= 2) {
          if (parsedTds[0].svg && !parsedTds[0].hasText) {
            leftIconSvg = parsedTds[0].svg;
          }
          const lastTd = parsedTds[parsedTds.length - 1];
          if (lastTd !== parsedTds[0] && lastTd.svg && !lastTd.hasText) {
            rightIconSvg = lastTd.svg;
          }
        }

        const headerLines = textTd.richLines.length > 0 ? [textTd.richLines[0].text] : [];
        const bodyLines = textTd.richLines;

        return {
          kind: 'table-card',
          stepBadge,
          leftIconSvg,
          rightIconSvg,
          headerLines,
          bodyLines,
          textAlign: textTd.align || 'center',
        };
      }
    }
  }

  // 3. Non-table HTML: check for multi-span single-line headers (e.g., AI Cluster "(GE • ADK • A2A)")
  //    or multi-line <br/> blocks with colored spans (e.g., Session State & Shared History)
  const noSvg = withoutBadge.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  const hasExplicitLineBreaks = /<br\s*\/?>|<\/div>\s*<div|<\/p>\s*<p/i.test(noSvg);
  const spanMatches = Array.from(noSvg.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi));

  if (!hasExplicitLineBreaks && spanMatches.length >= 2) {
    const inlineSpans: StructuredInlineSpan[] = [];
    for (const sm of spanMatches) {
      const sAttrs = sm[1] || '';
      const sText = stripTagsToLines(sm[2] || '').join(' ');
      if (!sText) continue;
      const sColor = extractFirstCssColor(sAttrs);
      const isBold = /font-weight\s*:\s*(?:bold|[6789]00)/i.test(sAttrs);
      const isSmall = /font-size\s*:\s*(?:[789](?:\.\d+)?px)/i.test(sAttrs);
      inlineSpans.push({ text: sText, color: sColor, bold: isBold, isSmall });
    }
    if (inlineSpans.length >= 2) {
      return {
        kind: 'standard',
        stepBadge,
        headerLines: [inlineSpans.map((s) => s.text).join(' ')],
        bodyLines: [],
        inlineSpans,
      };
    }
  }

  // Split by <br/> or block boundaries while preserving per-line color
  const rawSegments = noSvg
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .split('\n');

  const outerColor = extractFirstCssColor(noSvg);
  const outerBold = /font-weight\s*:\s*(?:bold|[6789]00)/i.test(noSvg);
  const bodyLines: { text: string; color?: string; bold?: boolean }[] = [];

  for (const seg of rawSegments) {
    const cleanText = stripTagsToLines(seg).join(' ');
    if (!cleanText) continue;
    const segColor = extractFirstCssColor(seg) || outerColor;
    const segBold = /font-weight\s*:\s*(?:bold|[6789]00)|<b\b|<strong\b/i.test(seg) || outerBold;
    bodyLines.push({ text: cleanText, color: segColor, bold: segBold });
  }

  return {
    kind: 'standard',
    stepBadge,
    headerLines: bodyLines.length > 0 ? [bodyLines[0].text] : [],
    bodyLines,
  };
}

