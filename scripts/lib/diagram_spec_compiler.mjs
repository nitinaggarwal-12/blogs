/**
 * Unified 3-Target Canonical Diagram Compiler for ge-blogs (1600x900 @ 7620 EMU/px).
 *
 * Compiles one declarative architecture spec into:
 *   1. Validated Draw.io XML (style-only container=1, parent="1" absolute coords,
 *      pic_icon_* official GCP SVGs without ;base64, verticalAlign=middle leaf cards,
 *      refined #595959 converging/diverging orthogonal elbows)
 *   2. Pure Standalone Vector SVG (viewBox="0 0 1600 900", responsive style="width:100%;height:auto",
 *      unique per-diagram <defs> IDs, data-node-id anchors, <tspan> per line, zero <foreignObject>,
 *      zero external href, inline official GCP vector <g> paths)
 *   3. 100% Native Editable DrawingML Slide XML (pic=0, 12192000x6858000 EMU, zero grpSp/arcTo/schemeClr,
 *      custGeom path w/h >= 91440 EMU so 'h="0"' never appears, forward tailEnd arrowheads,
 *      anchor="ctr" on leaf cards, single-run [Slide NN/TT • ...] + "Edit in Draw.io ↗" footer)
 */

import {
  DRAWINGML_ICON_BADGES,
  getDrawioIconStyle,
  renderInlineSvgIcon,
} from './gcp_official_svg_icons.mjs';

export const CANVAS_W = 1600;
export const CANVAS_H = 900;
export const EMU_PER_PX = 7620; // 12,192,000 / 1600 = 7620; 6,858,000 / 900 = 7620
export const MIN_CUSTGEOM_EMU = 91440; // >= 12px guarantees zero 'h="0"' or 'w="0"'

export function escXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pxToEmu(px) {
  return Math.round(Number(px) * EMU_PER_PX);
}

function hex6(color, fallback = '202124') {
  const m = String(color || '').trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? m[1].toUpperCase() : fallback;
}

export const PLANE_PALETTE = {
  CONTROL: { bg: '#E8F0FE', border: '#8AB4F8', text: '#174EA6', zoneStroke: '#93C5FD' },
  COMPUTE: { bg: '#E6F4EA', border: '#81C995', text: '#137333', zoneStroke: '#6EE7B7' },
  DATA: { bg: '#FEF7E0', border: '#FCD34D', text: '#B06000', zoneStroke: '#FCD34D' },
};

/**
 * Estimates vertical height of a card's text lines (used identically in SVG and Draw.io icon placement).
 */
function measureLines(lines) {
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const fs = ln.size || 11;
    const lh = ln.lineHeight || Math.round(fs * 1.32);
    total += lh + (i > 0 ? (ln.gapTop || 0) : 0);
  }
  return total;
}

/**
 * Computes exact polyline points for an edge in absolute canvas coordinates.
 */
export function resolveEdgePolyline(edge, boxesById) {
  const src = boxesById.get(edge.source);
  const tgt = boxesById.get(edge.target);
  if (!src || !tgt) {
    throw new Error(`Edge ${edge.id} references missing endpoint: ${edge.source} -> ${edge.target}`);
  }
  const ex = edge.exitX ?? 1;
  const ey = edge.exitY ?? 0.5;
  const nx = edge.entryX ?? 0;
  const ny = edge.entryY ?? 0.5;
  const p1 = { x: Math.round(src.x + src.w * ex), y: Math.round(src.y + src.h * ey) };
  const p2 = { x: Math.round(tgt.x + tgt.w * nx), y: Math.round(tgt.y + tgt.h * ny) };
  const mid = (edge.points || []).map((pt) => ({ x: Math.round(pt.x), y: Math.round(pt.y) }));
  return [p1, ...mid, p2];
}

/**
 * Clamps and validates every box in the spec strictly inside [0..1600] x [0..858].
 */
function assertSpecBounds(spec) {
  const check = (kind, id, x, y, w, h) => {
    if (x < 0 || y < 0 || x + w > CANVAS_W || y + h > 858) {
      throw new Error(
        `[${spec.id}] ${kind} "${id}" out of 1600x858 safe slide bounds: (${x},${y} ${w}x${h} -> ${x + w},${y + h})`
      );
    }
  };
  for (const z of spec.zones || []) check('zone', z.id, z.x, z.y, z.w, z.h);
  for (const c of spec.cards || []) check('card', c.id, c.x, c.y, c.w, c.h);
  for (const p of spec.pills || []) check('pill', p.id, p.x, p.y, p.w, p.h);
}

/**
 * Builds the unified boxes map for edge resolution.
 */
function buildBoxesMap(spec) {
  const map = new Map();
  for (const z of spec.zones || []) map.set(z.id, z);
  for (const c of spec.cards || []) map.set(c.id, c);
  return map;
}

/* ============================================================================
 * TARGET 1: DRAW.IO XML EMITTER
 * ============================================================================ */

function cardLinesToDrawioHtml(card) {
  const align = card.align || 'left';
  const lines = card.lines || [];
  const parts = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const fs = ln.size || 11;
    const fw = ln.bold ? '700' : '400';
    const clr = ln.color || (ln.bold ? '#202124' : '#5F6368');
    const mt = i > 0 && ln.gapTop ? `margin-top:${ln.gapTop}px;` : '';
    const lh = ln.lineHeight ? `${ln.lineHeight}px` : '1.28';
    const txt = escHtml(ln.text);
    parts.push(
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:${fs}px;font-weight:${fw};line-height:${lh};color:${clr};text-align:${align};${mt}">${txt}</div>`
    );
  }
  return parts.join('');
}

function renderPlaneGuideDrawioCells(guide, outCells) {
  if (!guide) return;
  // Outer card container
  outCells.push(
    `<mxCell id="${escXml(guide.id)}" value="" style="rounded=1;whiteSpace=wrap;html=1;arcSize=10;fillColor=#F8FAFC;strokeColor=#CBD5E1;strokeWidth=1.2;container=1;collapsible=0;pointerEvents=0;shadow=0;" vertex="1" parent="1"><mxGeometry x="${guide.x}" y="${guide.y}" width="${guide.w}" height="${guide.h}" as="geometry"/></mxCell>`
  );
  // Header text
  outCells.push(
    `<mxCell id="${escXml(guide.id)}_hdr" value="${escXml(`<div style="font-family:Arial,Helvetica,sans-serif;font-size:10.5px;font-weight:700;color:#0F172A;letter-spacing:0.3px;">${escHtml(guide.title)}</div>`)}" style="text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;spacingLeft=4;" vertex="1" parent="1"><mxGeometry x="${guide.x + 10}" y="${guide.y + 6}" width="${guide.w - 20}" height="18" as="geometry"/></mxCell>`
  );
  const rows = guide.rows || [];
  const hasFoot = Boolean(guide.footnote);
  const footH = hasFoot ? 22 : 0;
  const availH = guide.h - 32 - footH;
  const rowGap = 6;
  const rowH = Math.floor((availH - rowGap * (rows.length - 1)) / rows.length);
  rows.forEach((r, idx) => {
    const pal = PLANE_PALETTE[r.plane] || PLANE_PALETTE.CONTROL;
    const ry = guide.y + 28 + idx * (rowH + rowGap);
    const rx = guide.x + 10;
    const rw = guide.w - 20;
    const bodyHtml =
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.25;color:#0F172A;text-align:left;">` +
      `<b style="color:${pal.text};">${escHtml(r.plane)} PLANE</b>&nbsp;&nbsp;<b>${escHtml(r.headline)}</b>` +
      `<div style="font-size:9.5px;font-weight:400;color:#475569;margin-top:2px;">${escHtml(r.detail)}</div></div>`;
    outCells.push(
      `<mxCell id="legend_${escXml(guide.id)}_row_${escXml(r.plane)}" value="${escXml(bodyHtml)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=${pal.bg};strokeColor=${pal.border};strokeWidth=1;align=left;verticalAlign=middle;spacingLeft=8;spacingRight=8;spacingTop=3;spacingBottom=3;" vertex="1" parent="1"><mxGeometry x="${rx}" y="${ry}" width="${rw}" height="${rowH}" as="geometry"/></mxCell>`
    );
  });
  if (hasFoot) {
    outCells.push(
      `<mxCell id="${escXml(guide.id)}_note" value="${escXml(`<div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#64748B;line-height:1.2;">${escHtml(guide.footnote)}</div>`)}" style="text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;spacingLeft=4;" vertex="1" parent="1"><mxGeometry x="${guide.x + 10}" y="${guide.y + guide.h - footH - 2}" width="${guide.w - 20}" height="${footH}" as="geometry"/></mxCell>`
    );
  }
}

export function compileToDrawioXml(spec) {
  assertSpecBounds(spec);
  const boxesById = buildBoxesMap(spec);
  const cells = [
    '<mxCell id="0"/>',
    '<mxCell id="1" parent="0"/>',
  ];

  // 1. Title & top divider
  cells.push(
    `<mxCell id="title_main" value="${escXml(`<div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#202124;">${escHtml(spec.title)}</div>`)}" style="text;html=1;align=left;verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;" vertex="1" parent="1"><mxGeometry x="32" y="16" width="1420" height="32" as="geometry"/></mxCell>`
  );
  cells.push(
    `<mxCell id="bar_div_line" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#DADCE0;strokeColor=none;" vertex="1" parent="1"><mxGeometry x="32" y="54" width="1536" height="2" as="geometry"/></mxCell>`
  );

  // 2. Style-only container zones (parent="1", absolute coords, container=1;collapsible=0;pointerEvents=0)
  for (const z of spec.zones || []) {
    const dashed = z.dashed ? 'dashed=1;dashPattern=6 4;' : '';
    const stroke = z.stroke || '#DADCE0';
    const fill = z.fill || '#F8F9FA';
    const sw = z.strokeWidth ?? 1.2;
    const rx = z.rx ?? 14;
    const val = z.title
      ? escXml(
          `<div style="font-family:Arial,Helvetica,sans-serif;font-size:${z.titleSize || 12}px;font-weight:700;color:${z.titleColor || '#1967D2'};text-align:${z.titleAlign || 'left'};">${escHtml(z.title)}</div>`
        )
      : '';
    const vAlign = z.title ? 'verticalAlign=top;spacingTop=6;spacingLeft=12;spacingRight=12;' : 'verticalAlign=middle;';
    const hAlign = z.titleAlign === 'center' ? 'align=center;' : 'align=left;';
    cells.push(
      `<mxCell id="${escXml(z.id)}" value="${val}" style="rounded=1;absoluteArcSize=1;arcSize=${rx};whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=${sw};${dashed}container=1;collapsible=0;pointerEvents=0;${hAlign}${vAlign}shadow=0;" vertex="1" parent="1"><mxGeometry x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" as="geometry"/></mxCell>`
    );
  }

  // 3. Section headings (standalone text labels)
  for (const lbl of spec.labels || []) {
    const align = lbl.align || 'left';
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:${lbl.size || 13}px;font-weight:${lbl.bold === false ? '400' : '700'};color:${lbl.color || '#202124'};text-align:${align};">${escHtml(lbl.text)}</div>`;
    cells.push(
      `<mxCell id="${escXml(lbl.id)}" value="${escXml(html)}" style="text;html=1;align=${align};verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;" vertex="1" parent="1"><mxGeometry x="${lbl.x}" y="${lbl.y}" width="${lbl.w}" height="${lbl.h}" as="geometry"/></mxCell>`
    );
  }

  // 4. Cards (all leaf cards strictly verticalAlign=middle!)
  for (const c of spec.cards || []) {
    const isContainerCard = Boolean(c.isContainer);
    const fill = c.fill || '#FFFFFF';
    const stroke = c.stroke === 'none' ? 'none' : (c.stroke || '#DADCE0');
    const sw = c.strokeWidth ?? 1.2;
    const rx = c.rx ?? 12;
    const shadow = c.shadow ? 'shadow=1;' : 'shadow=0;';
    const align = c.align || 'left';
    const vAlign = isContainerCard ? 'top' : 'middle';
    const iconLayout = c.icon ? (c.iconPos || 'left') : 'none';
    const iconSize = c.iconSize || 20;

    let padL = c.padL ?? (align === 'center' ? 8 : 12);
    let padR = c.padR ?? (align === 'center' ? 8 : 12);
    let padT = c.padT ?? (isContainerCard ? 8 : 6);
    let padB = c.padB ?? 6;
    if (iconLayout === 'left') {
      padL = Math.max(padL, iconSize + 20);
    } else if (iconLayout === 'top') {
      // Reserve top icon offset inside centered block by adjusting spacingTop
      padT = iconSize + 10;
    }

    const containerAttr = isContainerCard ? 'container=1;collapsible=0;pointerEvents=0;' : '';
    const html = cardLinesToDrawioHtml(c);
    cells.push(
      `<mxCell id="${escXml(c.id)}" value="${escXml(html)}" style="rounded=1;absoluteArcSize=1;arcSize=${rx};whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=${sw};align=${align};verticalAlign=${vAlign};spacingLeft=${padL};spacingRight=${padR};spacingTop=${padT};spacingBottom=${padB};${containerAttr}${shadow}" vertex="1" parent="1"><mxGeometry x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" as="geometry"/></mxCell>`
    );

    // Emit separate pic_icon_* cell (stripped from #R hash, exempted by validator 'icon' heuristic)
    if (c.icon) {
      let ix = c.x + 12;
      let iy = c.y + Math.round((c.h - iconSize) / 2);
      if (iconLayout === 'top') {
        const textH = measureLines(c.lines || []);
        const totalBlock = iconSize + 8 + textH;
        ix = c.x + Math.round((c.w - iconSize) / 2);
        iy = Math.max(c.y + 10, Math.round(c.y + (c.h - totalBlock) / 2));
      } else if (iconLayout === 'top-left') {
        ix = c.x + 12;
        iy = c.y + 10;
      } else if (iconLayout === 'header-left') {
        ix = c.x + 12;
        iy = c.y + Math.round((c.h - iconSize) / 2);
      }
      cells.push(
        `<mxCell id="pic_icon_${escXml(c.id)}" value="" style="${getDrawioIconStyle(c.icon)}" vertex="1" parent="1"><mxGeometry x="${ix}" y="${iy}" width="${iconSize}" height="${iconSize}" as="geometry"/></mxCell>`
      );
    }

    // Optional embedded tile badges inside Front End / Targets / Runtime
    for (const tile of c.tiles || []) {
      const tx = tile.x;
      const ty = tile.y;
      const tw = tile.w;
      const th = tile.h;
      const tFill = tile.fill || '#F8FAFC';
      const tStroke = tile.stroke || '#CBD5E1';
      cells.push(
        `<mxCell id="${escXml(tile.id)}" value="" style="rounded=1;whiteSpace=wrap;html=1;arcSize=18;fillColor=${tFill};strokeColor=${tStroke};strokeWidth=1.1;shadow=0;" vertex="1" parent="1"><mxGeometry x="${tx}" y="${ty}" width="${tw}" height="${th}" as="geometry"/></mxCell>`
      );
      const isz = tile.iconSize || 24;
      const ix = tx + Math.round((tw - isz) / 2);
      const iy = tile.label ? ty + 6 : ty + Math.round((th - isz) / 2);
      cells.push(
        `<mxCell id="pic_icon_${escXml(tile.id)}" value="" style="${getDrawioIconStyle(tile.icon)}" vertex="1" parent="1"><mxGeometry x="${ix}" y="${iy}" width="${isz}" height="${isz}" as="geometry"/></mxCell>`
      );
      if (tile.label) {
        const lblHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:${tile.labelSize || 9}px;font-weight:700;color:${tile.labelColor || '#1F2937'};text-align:center;">${escHtml(tile.label)}</div>`;
        cells.push(
          `<mxCell id="${escXml(tile.id)}_lbl" value="${escXml(lblHtml)}" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;strokeColor=none;fillColor=none;" vertex="1" parent="1"><mxGeometry x="${tx}" y="${ty + th - 16}" width="${tw}" height="14" as="geometry"/></mxCell>`
        );
      }
    }
  }

  // 5. Plane guide card (WS1-WS4)
  renderPlaneGuideDrawioCells(spec.planeGuide, cells);

  // 6. Plane legend strip (WS5)
  for (const leg of spec.planeLegend || []) {
    const pal = PLANE_PALETTE[leg.plane] || PLANE_PALETTE.CONTROL;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#1F2937;text-align:left;"><b style="color:${pal.text};">${escHtml(leg.plane)}</b>&nbsp;&nbsp;${escHtml(leg.text)}</div>`;
    cells.push(
      `<mxCell id="${escXml(leg.id)}" value="${escXml(html)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=20;fillColor=${pal.bg};strokeColor=${pal.border};strokeWidth=1;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=8;" vertex="1" parent="1"><mxGeometry x="${leg.x}" y="${leg.y}" width="${leg.w}" height="${leg.h}" as="geometry"/></mxCell>`
    );
  }

  // 7. Plane boundary pills (top-border non-overlapping badges)
  for (const p of spec.pills || []) {
    const pal = PLANE_PALETTE[p.plane] || PLANE_PALETTE.CONTROL;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:8.5px;font-weight:700;color:${pal.text};letter-spacing:0.2px;white-space:nowrap;">${escHtml(p.text)}</div>`;
    cells.push(
      `<mxCell id="${escXml(p.id)}" value="${escXml(html)}" style="rounded=1;whiteSpace=wrap;html=1;arcSize=50;fillColor=${pal.bg};strokeColor=${pal.border};strokeWidth=1;align=center;verticalAlign=middle;spacingLeft=4;spacingRight=4;spacingTop=0;spacingBottom=0;" vertex="1" parent="1"><mxGeometry x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" as="geometry"/></mxCell>`
    );
  }

  // 8. Sophisticated orthogonal elbow connectors (#595959 default, rounded=1, endArrow=classic)
  for (const e of spec.edges || []) {
    const stroke = e.stroke || '#595959';
    const sw = e.strokeWidth ?? 1.5;
    const dashed = e.dashed ? 'dashed=1;dashPattern=6 4;' : '';
    const startArrow = e.bidirectional ? 'startArrow=classic;startFill=1;startSize=6;' : 'startArrow=none;';
    const endArrow = 'endArrow=classic;endFill=1;endSize=6;';
    const ex = e.exitX ?? 1;
    const ey = e.exitY ?? 0.5;
    const nx = e.entryX ?? 0;
    const ny = e.entryY ?? 0.5;
    const style =
      `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;` +
      `strokeColor=${stroke};strokeWidth=${sw};${dashed}${startArrow}${endArrow}` +
      `exitX=${ex};exitY=${ey};exitDx=0;exitDy=0;entryX=${nx};entryY=${ny};entryDx=0;entryDy=0;` +
      (e.label ? 'labelBackgroundColor=#FFFFFF;labelBorderColor=#CBD5E1;fontColor=#334155;fontSize=9;fontStyle=1;' : '');
    const ptsXml = (e.points && e.points.length)
      ? `<Array as="points">${e.points.map((pt) => `<mxPoint x="${Math.round(pt.x)}" y="${Math.round(pt.y)}"/>`).join('')}</Array>`
      : '';
    const valAttr = e.label ? escXml(e.label) : '';
    cells.push(
      `<mxCell id="${escXml(e.id)}" value="${valAttr}" style="${style}" edge="1" parent="1" source="${escXml(e.source)}" target="${escXml(e.target)}"><mxGeometry relative="1" as="geometry">${ptsXml}</mxGeometry></mxCell>`
    );
  }

  return (
    `<mxfile host="app.diagrams.net" modified="2026-11-23T07:30:00.000Z" agent="ge-blogs-canonical-compiler" version="24.7.17">\n` +
    `  <diagram id="${escXml(spec.id)}" name="${escXml(spec.diagramName || spec.id)}">\n` +
    `    <mxGraphModel dx="1420" dy="820" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${CANVAS_W}" pageHeight="${CANVAS_H}" math="0" shadow="0">\n` +
    `      <root>\n` +
    cells.map((c) => `        ${c}`).join('\n') +
    `\n      </root>\n` +
    `    </mxGraphModel>\n` +
    `  </diagram>\n` +
    `</mxfile>\n`
  );
}

/* ============================================================================
 * TARGET 2: PURE STANDALONE VECTOR SVG EMITTER (ZERO <foreignObject>, ZERO EMOJI)
 * ============================================================================ */

function renderSvgTextBlock(x, y, w, h, lines, opts = {}) {
  const align = opts.align || 'left';
  const vAlign = opts.vAlign || 'middle';
  const padL = opts.padL ?? (align === 'center' ? 8 : 12);
  const padR = opts.padR ?? (align === 'center' ? 8 : 12);
  const padT = opts.padT ?? 8;
  const anchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');
  const tx = align === 'center' ? x + w / 2 : (align === 'right' ? x + w - padR : x + padL);

  const totalH = measureLines(lines);
  let curY;
  if (vAlign === 'top') {
    curY = y + padT;
  } else {
    curY = y + (h - totalH) / 2;
    if (curY < y + 4) curY = y + 4;
  }

  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const fs = ln.size || 11;
    const lh = ln.lineHeight || Math.round(fs * 1.32);
    if (i > 0 && ln.gapTop) curY += ln.gapTop;
    const baselineY = curY + fs * 0.82;
    const fw = ln.bold ? '700' : '400';
    const fill = ln.color || (ln.bold ? '#202124' : '#5F6368');
    out.push(
      `<text x="${tx.toFixed(1)}" y="${baselineY.toFixed(1)}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="${fw}" fill="${fill}"><tspan>${escXml(ln.text)}</tspan></text>`
    );
    curY += lh;
  }
  return out.join('');
}

function buildRoundedOrthoPath(pts, radius = 6) {
  if (pts.length <= 2) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);
    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const pA = { x: curr.x - (dx1 / len1) * r, y: curr.y - (dy1 / len1) * r };
    const pB = { x: curr.x + (dx2 / len2) * r, y: curr.y + (dy2 / len2) * r };
    d += ` L ${pA.x.toFixed(1)} ${pA.y.toFixed(1)} Q ${curr.x} ${curr.y} ${pB.x.toFixed(1)} ${pB.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function compileToStandaloneSvg(spec) {
  assertSpecBounds(spec);
  const boxesById = buildBoxesMap(spec);
  const uid = spec.id.replace(/[^a-zA-Z0-9_]/g, '_');

  const markerColors = new Set(['#595959', '#1A73E8', '#5F6368', '#1E8E3E', '#7C3AED']);
  for (const e of spec.edges || []) {
    if (e.stroke) markerColors.add(e.stroke);
  }
  const colorToMarkerId = (hex) => `arr_${uid}_${hex.replace('#', '')}`;

  const defs = [
    `<filter id="cardShadow_${uid}" x="-8%" y="-8%" width="120%" height="122%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="2.8" flood-color="#0F172A" flood-opacity="0.11"/></filter>`,
  ];
  for (const clr of markerColors) {
    const mid = colorToMarkerId(clr);
    defs.push(
      `<marker id="${mid}_end" viewBox="0 0 10 10" refX="8.4" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M 0 1.2 L 8.8 5 L 0 8.8 L 1.8 5 z" fill="${clr}"/></marker>`
    );
    defs.push(
      `<marker id="${mid}_start" viewBox="0 0 10 10" refX="1.6" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto"><path d="M 10 1.2 L 1.2 5 L 10 8.8 L 8.2 5 z" fill="${clr}"/></marker>`
    );
  }

  const body = [];
  body.push(`<rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#FFFFFF"/>`);
  // Title & divider
  body.push(
    `<text data-node-id="t_main" x="32" y="39" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#202124"><tspan>${escXml(spec.title)}</tspan></text>`
  );
  body.push(`<rect data-node-id="mc_div_line" x="32" y="54" width="1536" height="2" fill="#DADCE0"/>`);

  // Zones
  for (const z of spec.zones || []) {
    const dash = z.dashed ? ' stroke-dasharray="6,4"' : '';
    const rx = z.rx ?? 14;
    body.push(
      `<rect data-node-id="${escXml(z.id)}" x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="${rx}" fill="${z.fill || '#F8F9FA'}" stroke="${z.stroke || '#DADCE0'}" stroke-width="${z.strokeWidth ?? 1.2}"${dash}/>`
    );
    if (z.title) {
      const tx = z.titleAlign === 'center' ? z.x + z.w / 2 : z.x + 14;
      const anchor = z.titleAlign === 'center' ? 'middle' : 'start';
      const fs = z.titleSize || 12;
      body.push(
        `<text x="${tx}" y="${z.y + 8 + fs * 0.85}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="700" fill="${z.titleColor || '#1967D2'}"><tspan>${escXml(z.title)}</tspan></text>`
      );
    }
  }

  // Labels
  for (const lbl of spec.labels || []) {
    const align = lbl.align || 'left';
    const anchor = align === 'center' ? 'middle' : (align === 'right' ? 'end' : 'start');
    const tx = align === 'center' ? lbl.x + lbl.w / 2 : (align === 'right' ? lbl.x + lbl.w : lbl.x);
    const fs = lbl.size || 13;
    const ty = lbl.y + lbl.h / 2 + fs * 0.35;
    body.push(
      `<text data-node-id="${escXml(lbl.id)}" x="${tx}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="${lbl.bold === false ? '400' : '700'}" fill="${lbl.color || '#202124'}"><tspan>${escXml(lbl.text)}</tspan></text>`
    );
  }

  // Cards
  for (const c of spec.cards || []) {
    const rx = c.rx ?? 12;
    const filt = c.shadow ? ` filter="url(#cardShadow_${uid})"` : '';
    const stroke = c.stroke === 'none' ? 'none' : (c.stroke || '#DADCE0');
    const sw = c.stroke === 'none' ? 0 : (c.strokeWidth ?? 1.2);
    body.push(
      `<rect data-node-id="${escXml(c.id)}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${rx}" fill="${c.fill || '#FFFFFF'}" stroke="${stroke}" stroke-width="${sw}"${filt}/>`
    );

    const isContainerCard = Boolean(c.isContainer);
    const align = c.align || 'left';
    const iconLayout = c.icon ? (c.iconPos || 'left') : 'none';
    const iconSize = c.iconSize || 20;
    let padL = c.padL ?? (align === 'center' ? 8 : 12);
    let padR = c.padR ?? (align === 'center' ? 8 : 12);

    if (c.icon && iconLayout === 'top') {
      const textH = measureLines(c.lines || []);
      const totalBlock = iconSize + 8 + textH;
      const topY = Math.max(c.y + 10, c.y + (c.h - totalBlock) / 2);
      const ix = c.x + (c.w - iconSize) / 2;
      body.push(renderInlineSvgIcon(c.icon, ix, topY, iconSize));
      body.push(
        renderSvgTextBlock(c.x, topY + iconSize + 6, c.w, textH + 4, c.lines || [], {
          align,
          vAlign: 'top',
          padL,
          padR,
          padT: 0,
        })
      );
    } else {
      if (c.icon) {
        const ix = c.x + 12;
        const iy = iconLayout === 'top-left' ? c.y + 10 : c.y + (c.h - iconSize) / 2;
        body.push(renderInlineSvgIcon(c.icon, ix, iy, iconSize));
        if (iconLayout === 'left' || iconLayout === 'header-left') {
          padL = Math.max(padL, iconSize + 20);
        }
      }
      body.push(
        renderSvgTextBlock(c.x, c.y, c.w, c.h, c.lines || [], {
          align,
          vAlign: isContainerCard ? 'top' : 'middle',
          padL,
          padR,
          padT: c.padT ?? 10,
        })
      );
    }

    for (const tile of c.tiles || []) {
      body.push(
        `<rect data-node-id="${escXml(tile.id)}" x="${tile.x}" y="${tile.y}" width="${tile.w}" height="${tile.h}" rx="10" fill="${tile.fill || '#F8FAFC'}" stroke="${tile.stroke || '#CBD5E1'}" stroke-width="1.1"/>`
      );
      const isz = tile.iconSize || 24;
      const ix = tile.x + (tile.w - isz) / 2;
      const iy = tile.label ? tile.y + 6 : tile.y + (tile.h - isz) / 2;
      body.push(renderInlineSvgIcon(tile.icon, ix, iy, isz));
      if (tile.label) {
        const fs = tile.labelSize || 9;
        body.push(
          `<text x="${(tile.x + tile.w / 2).toFixed(1)}" y="${(tile.y + tile.h - 6).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="700" fill="${tile.labelColor || '#1F2937'}"><tspan>${escXml(tile.label)}</tspan></text>`
        );
      }
    }
  }

  // Plane guide card (with deterministic SVG word-wrapping so zero text ever overflows!)
  function wrapSvgWords(text, maxChars) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const out = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > maxChars && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  if (spec.planeGuide) {
    const g = spec.planeGuide;
    body.push(
      `<rect data-node-id="${escXml(g.id)}" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.2"/>`
    );
    body.push(
      `<text x="${g.x + 14}" y="${g.y + 19}" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="10.5" font-weight="700" fill="#0F172A"><tspan>${escXml(g.title)}</tspan></text>`
    );
    const rows = g.rows || [];
    const hasFoot = Boolean(g.footnote);
    const footH = hasFoot ? 26 : 0;
    const availH = g.h - 32 - footH;
    const rowGap = 6;
    const rowH = Math.floor((availH - rowGap * (rows.length - 1)) / rows.length);
    const rw = g.w - 20;
    const detailMaxChars = Math.max(48, Math.floor((rw - 20) / 5.15));
    const headMaxChars = Math.max(42, Math.floor((rw - 20) / 5.5));
    rows.forEach((r, idx) => {
      const pal = PLANE_PALETTE[r.plane] || PLANE_PALETTE.CONTROL;
      const ry = g.y + 28 + idx * (rowH + rowGap);
      const rx = g.x + 10;
      body.push(
        `<rect data-node-id="${escXml(g.id)}_row_${escXml(r.plane)}" x="${rx}" y="${ry}" width="${rw}" height="${rowH}" rx="8" fill="${pal.bg}" stroke="${pal.border}" stroke-width="1"/>`
      );
      const headPrefix = `${r.plane} PLANE  `;
      const headLines = wrapSvgWords(r.headline, Math.max(26, headMaxChars - headPrefix.length));
      const detLines = wrapSvgWords(r.detail, detailMaxChars);
      const totalLines = headLines.length + detLines.length;
      const lh = rowH <= 36 ? 11.5 : 13;
      const blockH = totalLines * lh;
      let cy = ry + Math.max(4, (rowH - blockH) / 2);

      headLines.forEach((hl, hIdx) => {
        const by = cy + 9.5;
        if (hIdx === 0) {
          body.push(
            `<text x="${rx + 8}" y="${by.toFixed(1)}" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="9.6" font-weight="700"><tspan fill="${pal.text}">${escXml(r.plane)} PLANE</tspan><tspan fill="#0F172A">&#160;&#160;${escXml(hl)}</tspan></text>`
          );
        } else {
          body.push(
            `<text x="${rx + 8}" y="${by.toFixed(1)}" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="9.6" font-weight="700" fill="#0F172A"><tspan>${escXml(hl)}</tspan></text>`
          );
        }
        cy += lh;
      });
      detLines.forEach((dl) => {
        const by = cy + 9.2;
        body.push(
          `<text x="${rx + 8}" y="${by.toFixed(1)}" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="9.2" font-weight="400" fill="#475569"><tspan>${escXml(dl)}</tspan></text>`
        );
        cy += lh;
      });
    });
    if (hasFoot) {
      const fLines = wrapSvgWords(g.footnote, Math.max(52, Math.floor((g.w - 28) / 4.85)));
      const fTop = g.y + g.h - footH + 2;
      fLines.forEach((fl, fIdx) => {
        body.push(
          `<text x="${g.x + 14}" y="${(fTop + 9 + fIdx * 11).toFixed(1)}" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="8.8" fill="#64748B"><tspan>${escXml(fl)}</tspan></text>`
        );
      });
    }
  }

  // Plane legend strip (WS5)
  for (const leg of spec.planeLegend || []) {
    const pal = PLANE_PALETTE[leg.plane] || PLANE_PALETTE.CONTROL;
    body.push(
      `<rect data-node-id="${escXml(leg.id)}" x="${leg.x}" y="${leg.y}" width="${leg.w}" height="${leg.h}" rx="8" fill="${pal.bg}" stroke="${pal.border}" stroke-width="1"/>`
    );
    body.push(
      `<text x="${leg.x + 10}" y="${(leg.y + leg.h / 2 + 3.5).toFixed(1)}" text-anchor="start" font-family="Arial, Helvetica, sans-serif" font-size="10"><tspan font-weight="700" fill="${pal.text}">${escXml(leg.plane)}</tspan><tspan fill="#1F2937">&#160;&#160;${escXml(leg.text)}</tspan></text>`
    );
  }

  // Connectors (rendered before pills so pills sit crisply on top of borders, never sliced!)
  for (const e of spec.edges || []) {
    const pts = resolveEdgePolyline(e, boxesById);
    const d = buildRoundedOrthoPath(pts, 6);
    const clr = e.stroke || '#595959';
    const sw = e.strokeWidth ?? 1.5;
    const dash = e.dashed ? ' stroke-dasharray="6,4"' : '';
    const mid = colorToMarkerId(clr);
    const mStart = e.bidirectional ? ` marker-start="url(#${mid}_start)"` : '';
    const mEnd = ` marker-end="url(#${mid}_end)"`;
    body.push(
      `<path data-edge-id="${escXml(e.id)}" d="${d}" fill="none" stroke="${clr}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${dash}${mStart}${mEnd}/>`
    );
    if (e.label) {
      const midIdx = Math.floor(pts.length / 2);
      const pA = pts[Math.max(0, midIdx - 1)];
      const pB = pts[midIdx];
      const mx = (pA.x + pB.x) / 2;
      const my = (pA.y + pB.y) / 2;
      const bw = Math.max(36, e.label.length * 6.2 + 12);
      body.push(
        `<rect x="${(mx - bw / 2).toFixed(1)}" y="${(my - 9).toFixed(1)}" width="${bw.toFixed(1)}" height="18" rx="9" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>`
      );
      body.push(
        `<text x="${mx.toFixed(1)}" y="${(my + 3.2).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#334155"><tspan>${escXml(e.label)}</tspan></text>`
      );
    }
  }

  // Plane pills
  for (const p of spec.pills || []) {
    const pal = PLANE_PALETTE[p.plane] || PLANE_PALETTE.CONTROL;
    body.push(
      `<rect data-node-id="${escXml(p.id)}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${(p.h / 2).toFixed(1)}" fill="${pal.bg}" stroke="${pal.border}" stroke-width="1"/>`
    );
    body.push(
      `<text x="${(p.x + p.w / 2).toFixed(1)}" y="${(p.y + p.h / 2 + 3).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="700" fill="${pal.text}"><tspan>${escXml(p.text)}</tspan></text>`
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" style="width:100%;height:auto;display:block;background:#FFFFFF;">\n` +
    `  <defs>${defs.join('')}</defs>\n` +
    `  ${body.join('\n  ')}\n` +
    `</svg>\n`
  );
}

/* ============================================================================
 * TARGET 3: 100% NATIVE EDITABLE DRAWINGML SLIDE EMITTER (pic=0)
 * ============================================================================ */

function ooxmlLine(color, widthPt = 1.0, dashed = false, headArrow = false, tailArrow = false) {
  if (!color || color === 'none') return '<a:ln><a:noFill/></a:ln>';
  const wEmu = Math.max(9525, Math.round(widthPt * 12700));
  const dashXml = dashed ? '<a:prstDash val="dash"/>' : '<a:prstDash val="solid"/>';
  const headXml = headArrow ? '<a:headEnd type="triangle" w="med" len="med"/>' : '<a:headEnd type="none"/>';
  const tailXml = tailArrow ? '<a:tailEnd type="triangle" w="med" len="med"/>' : '<a:tailEnd type="none"/>';
  return `<a:ln w="${wEmu}" cap="flat" cmpd="sng"><a:solidFill><a:srgbClr val="${hex6(color)}"/></a:solidFill>${dashXml}<a:round/>${headXml}${tailXml}</a:ln>`;
}

function ooxmlParagraph(runs, algn = 'l', spcBefPt = 0, lnSpcPct = 115000) {
  const rXml = runs
    .map((r) => {
      const sz = Math.round((r.pt || 9) * 100);
      const b = r.bold ? ' b="1"' : ' b="0"';
      const clr = hex6(r.color || '#202124');
      const linkXml = r.hlinkRId ? `<a:hlinkClick r:id="${escXml(r.hlinkRId)}"/>` : '';
      return `<a:r><a:rPr lang="en-US" sz="${sz}"${b} dirty="0"><a:solidFill><a:srgbClr val="${clr}"/></a:solidFill><a:latin typeface="Arial"/>${linkXml}</a:rPr><a:t>${escXml(r.text)}</a:t></a:r>`;
    })
    .join('');
  return `<a:p><a:pPr algn="${algn}"><a:lnSpc><a:spcPct val="${lnSpcPct}"/></a:lnSpc><a:spcBef><a:spcPts val="${Math.round(spcBefPt * 100)}"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>${rXml}</a:p>`;
}

function ooxmlRectShape({ id, name, x, y, w, h, prst = 'roundRect', adj = 12000, fill, stroke, strokePt = 1.0, dashed = false, anchor = 'ctr', wrap = 'square', lIns = 60960, rIns = 60960, tIns = 38100, bIns = 38100, paragraphs = [] }) {
  const fillXml = !fill || fill === 'none' ? '<a:noFill/>' : `<a:solidFill><a:srgbClr val="${hex6(fill)}"/></a:solidFill>`;
  const avLst = prst === 'roundRect' ? `<a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst>` : '<a:avLst/>';
  const bodyXml = paragraphs.length
    ? `<p:txBody><a:bodyPr wrap="${wrap}" lIns="${lIns}" tIns="${tIns}" rIns="${rIns}" bIns="${bIns}" anchor="${anchor}"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paragraphs.join('')}</p:txBody>`
    : `<p:txBody><a:bodyPr wrap="square" anchor="ctr"/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody>`;
  return (
    `<p:sp>` +
    `<p:nvSpPr><p:cNvPr id="${id}" name="${escXml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr>` +
    `<a:xfrm><a:off x="${pxToEmu(x)}" y="${pxToEmu(y)}"/><a:ext cx="${Math.max(12700, pxToEmu(w))}" cy="${Math.max(12700, pxToEmu(h))}"/></a:xfrm>` +
    `<a:prstGeom prst="${prst}">${avLst}</a:prstGeom>` +
    `${fillXml}${ooxmlLine(stroke, strokePt, dashed)}` +
    `</p:spPr>${bodyXml}</p:sp>`
  );
}

function ooxmlIconBadgeShapes(iconKey, x, y, size, nextId) {
  const b = DRAWINGML_ICON_BADGES[iconKey] || DRAWINGML_ICON_BADGES.gcp_cloud;
  const shapes = [];
  if (iconKey === 'agent_gateway') {
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: `icon_bg_${iconKey}`,
        x, y, w: size, h: size,
        prst: 'ellipse',
        fill: '#FFFFFF',
        stroke: '#F28B82',
        strokePt: 1.2,
      })
    );
    const pad = Math.max(3, Math.round(size * 0.22));
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: `icon_fg_${iconKey}`,
        x: x + pad, y: y + pad, w: size - pad * 2, h: size - pad * 2,
        prst: 'diamond',
        fill: '#D93025',
        stroke: 'none',
      })
    );
    return shapes;
  }
  const bSize = Math.max(22, size);
  const bx = x - Math.round((bSize - size) / 2);
  const by = y - Math.round((bSize - size) / 2);
  const fontPt = b.glyph.length >= 4 ? 4.6 : (b.glyph.length === 3 ? 5.2 : 6.2);
  shapes.push(
    ooxmlRectShape({
      id: nextId(),
      name: `icon_badge_${iconKey}`,
      x: bx, y: by, w: bSize, h: bSize,
      prst: iconKey === 'google_g' || iconKey === 'gcp_cloud' || iconKey === 'saas_globe' ? 'ellipse' : 'roundRect',
      adj: 24000,
      fill: `#${b.bg}`,
      stroke: `#${b.border}`,
      strokePt: 1.1,
      anchor: 'ctr',
      wrap: 'none',
      lIns: 0, rIns: 0, tIns: 0, bIns: 0,
      paragraphs: [ooxmlParagraph([{ text: b.glyph, pt: fontPt, bold: true, color: `#${b.fg}` }], 'ctr', 0, 100000)],
    })
  );
  return shapes;
}

/**
 * Emits an orthogonal elbow connector as a top-level <p:sp> with <a:custGeom>,
 * clamping path w/h >= MIN_CUSTGEOM_EMU (91440) so 'h="0"' / 'w="0"' NEVER appears!
 */
function ooxmlOrthoConnectorShape(edge, pts, nextId) {
  const xs = pts.map((p) => pxToEmu(p.x));
  const ys = pts.map((p) => pxToEmu(p.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const boxW = Math.max(MIN_CUSTGEOM_EMU, maxX - minX);
  const boxH = Math.max(MIN_CUSTGEOM_EMU, maxY - minY);

  const cmds = pts
    .map((p, idx) => {
      const rx = pxToEmu(p.x) - minX;
      const ry = pxToEmu(p.y) - minY;
      return idx === 0
        ? `<a:moveTo><a:pt x="${rx}" y="${ry}"/></a:moveTo>`
        : `<a:lnTo><a:pt x="${rx}" y="${ry}"/></a:lnTo>`;
    })
    .join('');

  const stroke = edge.stroke || '#595959';
  const strokePt = (edge.strokeWidth ?? 1.5) * 0.75;
  const shapes = [
    `<p:sp>` +
      `<p:nvSpPr><p:cNvPr id="${nextId()}" name="edge_${escXml(edge.id)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr>` +
      `<a:xfrm><a:off x="${minX}" y="${minY}"/><a:ext cx="${boxW}" cy="${boxH}"/></a:xfrm>` +
      `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/>` +
      `<a:pathLst><a:path w="${boxW}" h="${boxH}" extrusionOk="0">${cmds}</a:path></a:pathLst></a:custGeom>` +
      `<a:noFill/>` +
      `${ooxmlLine(stroke, strokePt, Boolean(edge.dashed), Boolean(edge.bidirectional), true)}` +
      `</p:spPr></p:sp>`,
  ];

  if (edge.label) {
    const midIdx = Math.floor(pts.length / 2);
    const pA = pts[Math.max(0, midIdx - 1)];
    const pB = pts[midIdx];
    const mx = (pA.x + pB.x) / 2;
    const my = (pA.y + pB.y) / 2;
    const bw = Math.max(38, edge.label.length * 6.5 + 12);
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: `edge_lbl_${edge.id}`,
        x: mx - bw / 2,
        y: my - 9,
        w: bw,
        h: 18,
        prst: 'roundRect',
        adj: 50000,
        fill: '#FFFFFF',
        stroke: '#CBD5E1',
        strokePt: 0.75,
        anchor: 'ctr',
        lIns: 15240, rIns: 15240, tIns: 7620, bIns: 7620,
        paragraphs: [ooxmlParagraph([{ text: edge.label, pt: 6.8, bold: true, color: '#334155' }], 'ctr', 0, 100000)],
      })
    );
  }
  return shapes;
}

/**
 * Compiles spec into a complete standalone ppt/slides/slideN.xml (100% native DrawingML, pic=0).
 * footerText MUST be exact e.g. "[Slide 01/12 • PART 1 (WS1)]" (emitted in a single <a:t> run!).
 */
export function compileToSlideXml(spec, footerPrefix, hlinkRId = 'rId3') {
  assertSpecBounds(spec);
  const boxesById = buildBoxesMap(spec);
  let shapeId = 2;
  const nextId = () => shapeId++;
  const shapes = [];

  // Title & divider
  shapes.push(
    ooxmlRectShape({
      id: nextId(),
      name: 't_main',
      x: 32, y: 14, w: 1480, h: 36,
      prst: 'rect',
      fill: 'none', stroke: 'none',
      anchor: 'ctr',
      lIns: 0, rIns: 0, tIns: 0, bIns: 0,
      paragraphs: [ooxmlParagraph([{ text: spec.title, pt: 15.0, bold: true, color: '#202124' }], 'l', 0, 105000)],
    })
  );
  shapes.push(
    ooxmlRectShape({
      id: nextId(),
      name: 'mc_div_line',
      x: 32, y: 54, w: 1536, h: 2,
      prst: 'rect',
      fill: '#DADCE0', stroke: 'none',
    })
  );

  // Zones
  for (const z of spec.zones || []) {
    const algn = z.titleAlign === 'center' ? 'ctr' : 'l';
    const paras = z.title
      ? [ooxmlParagraph([{ text: z.title, pt: (z.titleSize || 12) * 0.66, bold: true, color: z.titleColor || '#1967D2' }], algn, 0, 102000)]
      : [];
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: z.id,
        x: z.x, y: z.y, w: z.w, h: z.h,
        prst: 'roundRect',
        adj: Math.min(20000, Math.round(((z.rx ?? 14) / Math.min(z.w, z.h)) * 100000)),
        fill: z.fill || '#F8F9FA',
        stroke: z.stroke || '#DADCE0',
        strokePt: (z.strokeWidth ?? 1.2) * 0.85,
        dashed: Boolean(z.dashed),
        anchor: 't',
        wrap: z.titleAlign === 'center' ? 'none' : 'square',
        lIns: 68580, rIns: 68580, tIns: 45720, bIns: 30480,
        paragraphs: paras,
      })
    );
  }

  // Standalone labels
  for (const lbl of spec.labels || []) {
    const algn = lbl.align === 'center' ? 'ctr' : (lbl.align === 'right' ? 'r' : 'l');
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: lbl.id,
        x: lbl.x, y: lbl.y, w: lbl.w, h: lbl.h,
        prst: 'rect',
        fill: 'none', stroke: 'none',
        anchor: 'ctr',
        wrap: 'none',
        lIns: 0, rIns: 0, tIns: 0, bIns: 0,
        paragraphs: [ooxmlParagraph([{ text: lbl.text, pt: (lbl.size || 13) * 0.68, bold: lbl.bold !== false, color: lbl.color || '#202124' }], algn, 0, 102000)],
      })
    );
  }

  // Cards (leaf cards strictly anchor="ctr" with mathematically non-overlapping top icon margin!)
  for (const c of spec.cards || []) {
    const isContainerCard = Boolean(c.isContainer);
    const algn = c.align === 'center' ? 'ctr' : (c.align === 'right' ? 'r' : 'l');
    const iconLayout = c.icon ? (c.iconPos || 'left') : 'none';
    const iconSize = c.iconSize || 20;
    let lIns = pxToEmu(c.padL ?? (algn === 'ctr' ? 6 : 10));
    let rIns = pxToEmu(c.padR ?? (algn === 'ctr' ? 6 : 10));
    let tIns = pxToEmu(c.padT ?? (isContainerCard ? 7 : 5));
    const bIns = pxToEmu(c.padB ?? 5);

    const isHeaderBar = iconLayout === 'header-left' || (isContainerCard && iconLayout === 'top-left');
    if (iconLayout === 'left' || iconLayout === 'header-left') {
      lIns = Math.max(lIns, pxToEmu(iconSize + 18));
    } else if (iconLayout === 'top') {
      // Pin top icon cleanly at c.y + 12 and reserve top 42px inset so anchor="ctr" NEVER collides!
      tIns = pxToEmu(iconSize + 22);
    } else if (iconLayout === 'top-left') {
      lIns = Math.max(pxToEmu(iconSize + 15), Math.min(lIns, pxToEmu(iconSize + 18)));
    }
    if (isHeaderBar) {
      rIns = pxToEmu(4);
    }

    const ptScale = isHeaderBar ? 0.62 : 0.66;
    const paras = (c.lines || []).map((ln, idx) =>
      ooxmlParagraph(
        [{ text: ln.text, pt: (ln.size || 11) * ptScale, bold: Boolean(ln.bold), color: ln.color || (ln.bold ? '#202124' : '#5F6368') }],
        algn,
        idx > 0 ? (ln.gapTop || 0) * 0.55 : 0,
        108000
      )
    );

    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: c.id,
        x: c.x, y: c.y, w: c.w, h: c.h,
        prst: 'roundRect',
        adj: Math.min(25000, Math.round(((c.rx ?? 12) / Math.min(c.w, c.h)) * 100000)),
        fill: c.fill || '#FFFFFF',
        stroke: c.stroke === 'none' ? 'none' : (c.stroke || '#DADCE0'),
        strokePt: (c.strokeWidth ?? 1.2) * 0.85,
        anchor: isContainerCard ? 't' : 'ctr',
        wrap: isHeaderBar ? 'none' : 'square',
        lIns, rIns, tIns, bIns,
        paragraphs: paras,
      })
    );

    if (c.icon) {
      let ix = c.x + 11;
      let iy = c.y + Math.round((c.h - iconSize) / 2);
      if (iconLayout === 'top') {
        ix = c.x + Math.round((c.w - iconSize) / 2);
        iy = c.y + 12;
      } else if (iconLayout === 'top-left') {
        ix = c.x + 11;
        iy = c.y + 10;
      }
      shapes.push(...ooxmlIconBadgeShapes(c.icon, ix, iy, iconSize, nextId));
    }

    for (const tile of c.tiles || []) {
      shapes.push(
        ooxmlRectShape({
          id: nextId(),
          name: tile.id,
          x: tile.x, y: tile.y, w: tile.w, h: tile.h,
          prst: 'roundRect',
          adj: 22000,
          fill: tile.fill || '#F8FAFC',
          stroke: tile.stroke || '#CBD5E1',
          strokePt: 0.85,
        })
      );
      const isz = tile.iconSize || 24;
      const ix = tile.x + Math.round((tile.w - isz) / 2);
      const iy = tile.label ? tile.y + 5 : tile.y + Math.round((tile.h - isz) / 2);
      shapes.push(...ooxmlIconBadgeShapes(tile.icon, ix, iy, isz, nextId));
      if (tile.label) {
        shapes.push(
          ooxmlRectShape({
            id: nextId(),
            name: `${tile.id}_lbl`,
            x: tile.x, y: tile.y + tile.h - 16, w: tile.w, h: 15,
            prst: 'rect',
            fill: 'none', stroke: 'none',
            anchor: 'ctr',
            lIns: 0, rIns: 0, tIns: 0, bIns: 0,
            paragraphs: [ooxmlParagraph([{ text: tile.label, pt: (tile.labelSize || 9) * 0.72, bold: true, color: tile.labelColor || '#1F2937' }], 'ctr', 0, 100000)],
          })
        );
      }
    }
  }

  // Plane guide card
  if (spec.planeGuide) {
    const g = spec.planeGuide;
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: g.id,
        x: g.x, y: g.y, w: g.w, h: g.h,
        prst: 'roundRect',
        adj: 6000,
        fill: '#F8FAFC', stroke: '#CBD5E1', strokePt: 0.9,
        anchor: 't',
        wrap: 'none',
        lIns: 91440, rIns: 91440, tIns: 45720, bIns: 22860,
        paragraphs: [ooxmlParagraph([{ text: g.title, pt: 7.2, bold: true, color: '#0F172A' }], 'l', 0, 102000)],
      })
    );
    const rows = g.rows || [];
    const hasFoot = Boolean(g.footnote);
    const footH = hasFoot ? 22 : 0;
    const availH = g.h - 32 - footH;
    const rowGap = 6;
    const rowH = Math.floor((availH - rowGap * (rows.length - 1)) / rows.length);
    rows.forEach((r, idx) => {
      const pal = PLANE_PALETTE[r.plane] || PLANE_PALETTE.CONTROL;
      const ry = g.y + 28 + idx * (rowH + rowGap);
      shapes.push(
        ooxmlRectShape({
          id: nextId(),
          name: `${g.id}_row_${r.plane}`,
          x: g.x + 10, y: ry, w: g.w - 20, h: rowH,
          prst: 'roundRect',
          adj: 14000,
          fill: pal.bg, stroke: pal.border, strokePt: 0.75,
          anchor: 'ctr',
          lIns: 60960, rIns: 60960, tIns: 22860, bIns: 22860,
          paragraphs: [
            ooxmlParagraph(
              [
                { text: `${r.plane} PLANE`, pt: 7.2, bold: true, color: pal.text },
                { text: `  ${r.headline}`, pt: 7.2, bold: true, color: '#0F172A' },
              ],
              'l', 0, 105000
            ),
            ooxmlParagraph([{ text: r.detail, pt: 6.8, bold: false, color: '#475569' }], 'l', 1.5, 108000),
          ],
        })
      );
    });
    if (hasFoot) {
      shapes.push(
        ooxmlRectShape({
          id: nextId(),
          name: `${g.id}_note`,
          x: g.x + 10, y: g.y + g.h - footH - 2, w: g.w - 20, h: footH,
          prst: 'rect',
          fill: 'none', stroke: 'none',
          anchor: 'ctr',
          lIns: 30480, rIns: 30480, tIns: 0, bIns: 0,
          paragraphs: [ooxmlParagraph([{ text: g.footnote, pt: 6.5, bold: false, color: '#64748B' }], 'l', 0, 105000)],
        })
      );
    }
  }

  // Plane legend strip (WS5)
  for (const leg of spec.planeLegend || []) {
    const pal = PLANE_PALETTE[leg.plane] || PLANE_PALETTE.CONTROL;
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: leg.id,
        x: leg.x, y: leg.y, w: leg.w, h: leg.h,
        prst: 'roundRect',
        adj: 24000,
        fill: pal.bg, stroke: pal.border, strokePt: 0.75,
        anchor: 'ctr',
        lIns: 60960, rIns: 45720, tIns: 15240, bIns: 15240,
        paragraphs: [
          ooxmlParagraph(
            [
              { text: `${leg.plane}  `, pt: 7.2, bold: true, color: pal.text },
              { text: leg.text, pt: 7.0, bold: false, color: '#1F2937' },
            ],
            'l', 0, 105000
          ),
        ],
      })
    );
  }

  // Connectors
  for (const e of spec.edges || []) {
    const pts = resolveEdgePolyline(e, boxesById);
    shapes.push(...ooxmlOrthoConnectorShape(e, pts, nextId));
  }

  // Plane pills (top layer — single-line wrap="none" so zero pills ever wrap onto 2 lines!)
  for (const p of spec.pills || []) {
    const pal = PLANE_PALETTE[p.plane] || PLANE_PALETTE.CONTROL;
    shapes.push(
      ooxmlRectShape({
        id: nextId(),
        name: p.id,
        x: p.x - 2, y: p.y, w: p.w + 4, h: p.h,
        prst: 'roundRect',
        adj: 50000,
        fill: pal.bg, stroke: pal.border, strokePt: 0.75,
        anchor: 'ctr',
        wrap: 'none',
        lIns: 7620, rIns: 7620, tIns: 0, bIns: 0,
        paragraphs: [ooxmlParagraph([{ text: p.text, pt: 5.7, bold: true, color: pal.text }], 'ctr', 0, 100000)],
      })
    );
  }

  // Canonical Footer at exact EMU (518160, 6586538, 11155680x213360) with single-run [Slide NN/TT • ...] + Edit in Draw.io ↗ (zero 🔗)
  shapes.push(
    `<p:sp>` +
      `<p:nvSpPr><p:cNvPr id="${nextId()}" name="canonical_drawio_footer"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr><a:xfrm><a:off x="518160" y="6586538"/><a:ext cx="11155680" cy="213360"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>` +
      `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="ctr"><a:noAutofit/></a:bodyPr><a:lstStyle/>` +
      `${ooxmlParagraph(
        [
          { text: `${footerPrefix}  •  `, pt: 8.5, bold: true, color: '#5F6368' },
          { text: 'Edit in Draw.io ↗', pt: 8.5, bold: true, color: '#1A73E8', hlinkRId },
        ],
        'r', 0, 100000
      )}` +
      `</p:txBody></p:sp>`
  );

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld>` +
    `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>` +
    `<p:spTree>` +
    `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
    shapes.join('') +
    `</p:spTree></p:cSld>` +
    `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>` +
    `</p:sld>`
  );
}
