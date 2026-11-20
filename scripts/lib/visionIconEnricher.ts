/**
 * 🎨 Vision Decompiler Vector Icon Enricher & Image Metadata Preserver
 *
 * 1. Automatically restores and injects crisp, high-contrast inline vector SVGs
 *    into Draw.io <mxCell> nodes whose icons were omitted or replaced with ASCII
 *    placeholders ('+', '✦') during multimodal LLM image-to-XML decompilation.
 * 2. Self-contains the original uploaded image source inside the <mxfile> root
 *    attribute (`data-source-image`) so saving to Global Library (/api/diagrams)
 *    and reloading via `/vision?id=...` always restores the exact original image.
 */

function escapeXmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeXmlAttr(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Embeds the original image Data URI or URL directly into the <mxfile> root tag
 * so it persists across database saves (/api/diagrams) and URL shares (/vision?id=...).
 */
export function embedSourceImageInXml(xml: string, imageSrc: string): string {
  if (!xml || !imageSrc) return xml;
  const escapedImg = escapeXmlAttr(imageSrc);
  if (xml.includes('data-source-image=')) {
    return xml.replace(/data-source-image="[^"]*"/, `data-source-image="${escapedImg}"`);
  }
  if (xml.includes('<mxfile')) {
    return xml.replace(/<mxfile\b/, `<mxfile data-source-image="${escapedImg}"`);
  }
  return xml;
}

/**
 * Extracts the embedded original image Data URI or URL from a Draw.io XML string.
 */
export function extractSourceImageFromXml(xml: string): string | null {
  if (!xml) return null;
  const match = xml.match(/data-source-image="([^"]+)"/);
  if (match && match[1]) {
    return unescapeXmlAttr(match[1]);
  }
  return null;
}

/**
 * Raw SVG definitions (24x24 viewBox) designed for high contrast on dark & light themes.
 */
const RAW_SVGS: Record<string, (size: number, color: string) => string> = {
  // 4-point Gemini Sparkle star (multi-tone Google AI look)
  geminiSparkle: (size = 20, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">` +
    `<path d="M12 2C12 7.52285 16.4772 12 22 12C16.4772 12 12 16.4772 12 22C12 16.4772 7.52285 12 2 12C7.52285 12 12 7.52285 12 2Z" fill="${color}" stroke="#A855F7" stroke-width="1.2"/>` +
    `</svg>`,

  // Stylized 'A' for Google Antigravity
  antigravityA: (size = 20, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M12 3L4 20h3.5l1.8-4h5.4l1.8 4H20L12 3z" fill="rgba(96,165,250,0.18)"/>` +
    `<path d="M9.8 13.5h4.4" stroke="#F43F5E" stroke-width="2.2"/>` +
    `</svg>`,

  // Multi-sparkles / 1P, 3P, open models
  modelsSparkles: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M9.9 2.5C9.9 6.4 13 9.5 16.9 9.5C13 9.5 9.9 12.6 9.9 16.5C9.9 12.6 6.8 9.5 2.9 9.5C6.8 9.5 9.9 6.4 9.9 2.5Z" fill="rgba(96,165,250,0.22)"/>` +
    `<path d="M18.5 13.5C18.5 15.4 20.1 17 22 17C20.1 17 18.5 18.6 18.5 20.5C18.5 18.6 16.9 17 15 17C16.9 17 18.5 15.4 18.5 13.5Z" stroke="#F59E0B" fill="rgba(245,158,11,0.28)"/>` +
    `<circle cx="5" cy="19" r="1.6" fill="#A855F7"/>` +
    `</svg>`,

  // Model tuning and training (Sliders)
  slidersTuning: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<line x1="4" y1="6" x2="20" y2="6"/>` +
    `<line x1="4" y1="12" x2="20" y2="12"/>` +
    `<line x1="4" y1="18" x2="20" y2="18"/>` +
    `<circle cx="9" cy="6" r="2.3" fill="#1E293B" stroke="${color}" stroke-width="2"/>` +
    `<circle cx="15" cy="12" r="2.3" fill="#1E293B" stroke="${color}" stroke-width="2"/>` +
    `<circle cx="10" cy="18" r="2.3" fill="#1E293B" stroke="${color}" stroke-width="2"/>` +
    `</svg>`,

  // Agent frameworks and APIs (Terminal / Code window)
  terminalApis: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<rect x="3" y="4" width="18" height="16" rx="3" fill="rgba(96,165,250,0.12)"/>` +
    `<polyline points="8 10 11 13 8 16"/>` +
    `<line x1="13" y1="16" x2="17" y2="16"/>` +
    `</svg>`,

  // Agent runtimes and sandboxes (Gear / Cog)
  gearRuntime: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<circle cx="12" cy="12" r="3.2" fill="rgba(96,165,250,0.2)"/>` +
    `<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>` +
    `</svg>`,

  // Agent governance (Split Branch Arrows)
  branchGovernance: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M12 20V10"/>` +
    `<path d="M12 10L7 5"/>` +
    `<path d="M12 10L17 5"/>` +
    `<polyline points="7 9 7 5 11 5"/>` +
    `<polyline points="13 5 17 5 17 9"/>` +
    `</svg>`,

  // Policy and security gateways (Shield with Magnifying Glass / Check)
  shieldPolicy: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(96,165,250,0.12)"/>` +
    `<circle cx="11.5" cy="11" r="2.8"/>` +
    `<line x1="13.5" y1="13" x2="15.5" y2="15"/>` +
    `</svg>`,

  // Advanced threat detection (Half-filled Shield)
  shieldThreat: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>` +
    `<path d="M12 2V22C12 22 20 18 20 12V5L12 2Z" fill="${color}" fill-opacity="0.35"/>` +
    `</svg>`,

  // Observability, evaluation, simulation (Gauge / Speedometer)
  gaugeObservability: (size = 26, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M12 15m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="${color}"/>` +
    `<path d="M13.41 13.59L17 10"/>` +
    `<path d="M3.34 17a10 10 0 1 1 17.32 0"/>` +
    `</svg>`,

  // Database cylinder
  databaseIcon: (size = 22, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8">` +
    `<ellipse cx="12" cy="5" rx="8" ry="3" fill="rgba(96,165,250,0.18)"/>` +
    `<path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/>` +
    `<path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/>` +
    `</svg>`,

  // Cloud / Server compute
  cloudIcon: (size = 22, color = '#60A5FA') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="rgba(96,165,250,0.15)"/>` +
    `</svg>`
};

interface IconMatchRule {
  pattern: RegExp;
  iconKey: keyof typeof RAW_SVGS;
  layout: 'inline' | 'stacked';
  size?: number;
}

const ICON_MATCH_RULES: IconMatchRule[] = [
  // Horizontal inline brand / app titles
  { pattern: /^gemini\s+enterprise$/i, iconKey: 'geminiSparkle', layout: 'inline', size: 22 },
  { pattern: /gemini\s+enterprise\s+app/i, iconKey: 'geminiSparkle', layout: 'inline', size: 18 },
  { pattern: /google\s+antigravity/i, iconKey: 'antigravityA', layout: 'inline', size: 18 },
  { pattern: /codemender/i, iconKey: 'geminiSparkle', layout: 'inline', size: 18 },
  { pattern: /gemini\s+enterprise\s+for\s+customer/i, iconKey: 'geminiSparkle', layout: 'inline', size: 18 },
  { pattern: /gemini\s+spark/i, iconKey: 'geminiSparkle', layout: 'inline', size: 18 },

  // Vertical stacked capability cards (Gemini Enterprise Agent Platform)
  { pattern: /1p,\s*3p,\s*open\s*models|open\s*models/i, iconKey: 'modelsSparkles', layout: 'stacked', size: 26 },
  { pattern: /model\s*tuning\s*and\s*training|tuning\s*&\s*training/i, iconKey: 'slidersTuning', layout: 'stacked', size: 26 },
  { pattern: /agent\s*frameworks\s*and\s*apis|frameworks\s*&\s*apis/i, iconKey: 'terminalApis', layout: 'stacked', size: 26 },
  { pattern: /agent\s*runtimes\s*and\s*sandboxes|runtimes\s*&\s*sandboxes/i, iconKey: 'gearRuntime', layout: 'stacked', size: 26 },
  { pattern: /agent\s*governance/i, iconKey: 'branchGovernance', layout: 'stacked', size: 26 },
  { pattern: /policy\s*and\s*security\s*gateways|security\s*gateways/i, iconKey: 'shieldPolicy', layout: 'stacked', size: 26 },
  { pattern: /advanced\s*threat\s*detection|threat\s*detection/i, iconKey: 'shieldThreat', layout: 'stacked', size: 26 },
  { pattern: /observability,\s*evaluation,\s*simulation|observability/i, iconKey: 'gaugeObservability', layout: 'stacked', size: 26 },
];

/**
 * Strips HTML tags, entities, and leading ASCII icon placeholders ('+', '✦') to extract clean plain text.
 */
function extractPlainText(escapedHtml: string): string {
  // Decode XML entities first so nested &quot; inside &lt;font style=&quot;...&quot;&gt; never blocks tag removal
  const decoded = escapedHtml
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  const textWithNewlines = decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|h[1-6]|li|tr|td|font)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const lines = textWithNewlines
    .split('\n')
    .map(seg =>
      seg
        .replace(/^[+\u2726\u2728\u2022*•-]+\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);

  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0];

  // If second line is a short qualifier (e.g. 'app' or 'for Customer Experience'), join it; if long sentence, drop it
  if (lines[1].length <= 26 && !lines[1].toLowerCase().startsWith('end-to-end')) {
    return `${lines[0]} ${lines[1]}`.trim();
  }
  return lines[0];
}

/**
 * Strips leading ASCII icon placeholders ('+', '✦') from raw value attribute before wrapping with SVG.
 */
function stripLeadingAsciiPlaceholder(valAttr: string): string {
  return valAttr
    .replace(/^(\s*(?:&lt;[^&]+&gt;|<[^>]+>)*\s*)[+\u2726\u2728]+\s+/, '$1')
    .trim();
}

export interface DiagramObjectMetadata {
  id: string;
  urlSlug: string;
  label: string;
  plainTitle: string;
  zone: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isContainer: boolean;
}

/**
 * Extracts all addressable objects/vertices from Draw.io XML with unique URL-addressable slugs.
 */
export function extractDiagramObjects(xml: string): DiagramObjectMetadata[] {
  if (!xml || typeof xml !== 'string') return [];

  const objects: DiagramObjectMetadata[] = [];
  const cellRegex = /<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/gi;
  let match: RegExpExecArray | null;
  let idx = 1;

  while ((match = cellRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const inner = match[2] || '';
    if (!/\bvertex="1"/i.test(attrs)) continue;

    const idMatch = attrs.match(/\bid="([^"]+)"/i);
    const valMatch = attrs.match(/\bvalue="([^"]*)"/i);
    const cellId = idMatch ? idMatch[1] : `node_${idx}`;
    if (cellId === '0' || cellId === '1' || cellId === 'bg') continue;

    const rawVal = valMatch ? valMatch[1] : '';
    const plain = extractPlainText(rawVal);

    const xMatch = inner.match(/\bx="([0-9.-]+)"/i);
    const yMatch = inner.match(/\by="([0-9.-]+)"/i);
    const wMatch = inner.match(/\bwidth="([0-9.-]+)"/i);
    const hMatch = inner.match(/\bheight="([0-9.-]+)"/i);

    const x = xMatch ? parseFloat(xMatch[1]) : 0;
    const y = yMatch ? parseFloat(yMatch[1]) : 0;
    const width = wMatch ? parseFloat(wMatch[1]) : 120;
    const height = hMatch ? parseFloat(hMatch[1]) : 60;

    // Skip empty background rectangles unless they have a meaningful label
    if (!plain && cellId !== 'header_icon') continue;

    const displayTitle = plain || (cellId === 'header_icon' ? 'Gemini Sparkle Brand Icon' : cellId);
    const cleanSlug = displayTitle
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24)
      .replace(/-+$/g, '');

    const paddedIdx = String(idx).padStart(2, '0');
    const urlSlug = `OBJ-${paddedIdx}-${cleanSlug || cellId.toUpperCase()}`;

    let zone = 'Core Architecture';
    if (y < 200) zone = 'Header & Value Pillars';
    else if (y < 510) zone = 'Apps & Solutions Tier';
    else if (y < 880) zone = 'Agentic Capabilities Platform';
    else zone = 'Governance & Footer';

    objects.push({
      id: cellId,
      urlSlug,
      label: displayTitle,
      plainTitle: displayTitle,
      zone,
      x,
      y,
      width,
      height,
      isContainer: width > 600 && height > 150
    });

    idx++;
  }

  return objects;
}

/**
 * Post-processes Draw.io XML to inject crisp inline vector SVG icons into cells
 * that match known architecture/Gemini capabilities regardless of attribute order,
 * and repairs malformed base64 SVG Data URIs in style="shape=image;image=data:image/svg+xml,..."
 */
export function enrichDrawioXmlWithVectorIcons(xml: string): string {
  if (!xml || typeof xml !== 'string' || !xml.includes('<mxCell')) return xml;

  // 1. Repair malformed base64 SVG data URIs that omitted ';base64' before the comma:
  // e.g. image=data:image/svg+xml,PHN2Zy... -> image=data:image/svg+xml;base64,PHN2Zy...
  let sanitizedXml = xml.replace(
    /image=data:image\/svg\+xml,([A-Za-z0-9+/=]{20,})/g,
    'image=data:image/svg+xml;base64,$1'
  );

  // 2. If 'header_icon' is a separate broken/duplicate shape=image cell next to Gemini Enterprise,
  // convert it directly into a clean inline SVG vertex so Draw.io renders it with 100% vector fidelity
  sanitizedXml = sanitizedXml.replace(
    /<mxCell\s+id="header_icon"[^>]*?style="[^"]*shape=image[^"]*"[^>]*?>([\s\S]*?)<\/mxCell>/gi,
    (_m, innerGeo) => {
      const starSvg = escapeXmlAttr(RAW_SVGS.geminiSparkle(36, '#60A5FA'));
      return `<mxCell id="header_icon" value="${starSvg}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;" vertex="1" parent="1">${innerGeo}</mxCell>`;
    }
  );

  // Match every <mxCell ...> block (including self-closing or with child <mxGeometry>)
  return sanitizedXml.replace(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/gi, (fullMatch, attrs, innerContent = '') => {
    // Only process vertex="1" cells and skip cells that already have shape=image or image=data:image/
    if (!/\bvertex="1"/i.test(attrs) || /\bshape=image\b/i.test(attrs) || attrs.includes('image=data:image/')) {
      return fullMatch;
    }

    const valMatch = attrs.match(/\bvalue="([^"]*)"/i);
    if (!valMatch) {
      return fullMatch;
    }

    // Strip any broken relative <img> tags inside value attribute emitted by LLM
    let valAttr = valMatch[1]
      .replace(/&lt;img\b[^&]*?&gt;/gi, '')
      .replace(/<img\b[^>]*?>/gi, '');

    // Skip if already contains an inline SVG or data:image
    if (valAttr.includes('&lt;svg') || valAttr.includes('<svg') || valAttr.includes('data:image/')) {
      if (valAttr !== valMatch[1]) {
        const cleanedAttrs = attrs.replace(/\bvalue="[^"]*"/i, `value="${valAttr}"`);
        return innerContent ? `<mxCell${cleanedAttrs}>${innerContent}</mxCell>` : `<mxCell${cleanedAttrs}/>`;
      }
      return fullMatch;
    }

    const plain = extractPlainText(valAttr);
    if (!plain || plain.length < 3 || plain.length > 140) {
      return fullMatch;
    }

    // Special case: Top header banner with Gemini Enterprise + subtitle
    if (/end-to-end solution across/i.test(plain) && /gemini enterprise/i.test(plain)) {
      const svgRaw = RAW_SVGS.geminiSparkle(24, '#60A5FA');
      const svgEscapedHdr = escapeXmlAttr(svgRaw);
      const cleanedVal = valAttr.replace(/^\s*[+\u2726\u2728]+\s*/g, '');
      const enrichedVal = cleanedVal.replace(
        /(?:\+\s*)?(Gemini Enterprise)/i,
        `&lt;span style=&quot;display:inline-flex;align-items:center;gap:8px;vertical-align:middle;&quot;&gt;${svgEscapedHdr}&lt;span&gt;$1&lt;/span&gt;&lt;/span&gt;`
      );
      if (enrichedVal !== valAttr) {
        const newAttrs = attrs.replace(/\bvalue="[^"]*"/i, `value="${enrichedVal}"`);
        return innerContent ? `<mxCell${newAttrs}>${innerContent}</mxCell>` : `<mxCell${newAttrs}/>`;
      }
    }

    const matchedRule = ICON_MATCH_RULES.find(r => r.pattern.test(plain));
    if (!matchedRule) {
      return fullMatch;
    }

    const svgRaw = RAW_SVGS[matchedRule.iconKey](matchedRule.size || 24, '#60A5FA');
    const svgEscaped = escapeXmlAttr(svgRaw);
    const cleanedValAttr = stripLeadingAsciiPlaceholder(valAttr);

    let newValAttr = cleanedValAttr;
    let updatedInner = innerContent;

    if (matchedRule.layout === 'stacked') {
      // Stacked vertical card layout: Icon centered on top, wrapped text below
      newValAttr =
        `&lt;div style=&quot;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;text-align:center;padding:2px;&quot;&gt;` +
        `&lt;div style=&quot;flex-shrink:0;display:flex;align-items:center;justify-content:center;&quot;&gt;${svgEscaped}&lt;/div&gt;` +
        `&lt;div style=&quot;line-height:1.15;max-width:105px;white-space:normal;word-wrap:break-word;&quot;&gt;${cleanedValAttr}&lt;/div&gt;` +
        `&lt;/div&gt;`;

      // Ensure stacked vertical card has adequate height (>= 66px) so icon + text never clip
      updatedInner = updatedInner.replace(/<mxGeometry\b([^>]*?)height="([0-9.]+)"([^>]*?)>/i, (geoMatch: string, gBefore: string, hStr: string, gAfter: string) => {
        const h = parseFloat(hStr);
        if (!isNaN(h) && h < 66) {
          const newH = 68;
          const delta = newH - h;
          let updatedBefore = gBefore;
          updatedBefore = updatedBefore.replace(/y="([0-9.]+)"/i, (_ym: string, yStr: string) => {
            const y = parseFloat(yStr);
            return `y="${Math.max(0, Math.round(y - delta / 2))}"`;
          });
          return `<mxGeometry${updatedBefore}height="${newH}"${gAfter}>`;
        }
        return geoMatch;
      });
    } else {
      // Inline horizontal layout: Icon on left, text on right
      newValAttr =
        `&lt;div style=&quot;display:flex;align-items:center;justify-content:center;gap:6px;&quot;&gt;` +
        `&lt;span style=&quot;flex-shrink:0;display:inline-flex;align-items:center;&quot;&gt;${svgEscaped}&lt;/span&gt;` +
        `&lt;span&gt;${cleanedValAttr}&lt;/span&gt;` +
        `&lt;/div&gt;`;
    }

    // Ensure style includes html=1
    let updatedAttrs = attrs.replace(/\bvalue="[^"]*"/i, `value="${newValAttr}"`);
    if (!updatedAttrs.includes('html=1')) {
      updatedAttrs = updatedAttrs.replace(/style="([^"]*)"/i, 'style="html=1;$1"');
    }

    return updatedInner ? `<mxCell${updatedAttrs}>${updatedInner}</mxCell>` : `<mxCell${updatedAttrs}/>`;
  });
}
