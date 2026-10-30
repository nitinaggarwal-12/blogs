/**
 * Pattern-specific Official Google Cloud Architecture Center layouts (Rule 53G — Per-Pattern Geometry Contract).
 *
 * The default `hub-2-spoke` layout (compileOfficialArchCenterSvg / compileOfficialDrawioXml in
 * build_all_workstream_diagrams.mjs) is technically right for a hub routing to two spoke *types*
 * (WS1 taxonomy, WS3 silos, WS4 hybrid). It is wrong for:
 *
 *   • Pattern A (WS2): pooled means ONE Agent Engine pool, ONE Model Armor, ONE AlloyDB schema with RLS,
 *     ONE Memory Bank with namespaces. Drawing two bounded per-tenant stacks draws a silo and calls it a pool.
 *     → `pooled-shared-plane`: one shared wrapper, Zone 3 = shared runtime, Zone 4 = shared data & tool plane,
 *       tenant partitions rendered as chips INSIDE the shared AlloyDB / Memory Bank cards.
 *
 *   • WS5 decision guide: a decision tree has no request/response flow.
 *     → `decision-tree-3-outcome`: executive inputs → Q1 (compliance) → Q2 (tiers) → three outcome spokes
 *       (B | A | C, zero edge crossings) joined by the Agentic Triad "80% reusable core" bar.
 *
 * Both layouts keep the Architecture Center visual language: #1a73e8 Google Cloud frame, pastel zone fills,
 * white 2px-stroke service cards with official icons, royal-blue numbered step badges, orthogonal connectors.
 *
 * Every function receives `P` (primitives from the main builder) so this module has no circular imports:
 *   P = { escXml, resolveArchIconUri, OFFICIAL_ASSETS, USER_SILHOUETTE_DATA_URI, renderArchCardSvg, renderStepCircleSvg, fitAttr }
 */

export const LAYOUT_HUB_2_SPOKE = 'hub-2-spoke';
export const LAYOUT_POOLED_SHARED_PLANE = 'pooled-shared-plane';
export const LAYOUT_DECISION_TREE_3_OUTCOME = 'decision-tree-3-outcome';

const W = 1200;
const H = 1410;
const FONT = "'Google Sans', 'Roboto', Arial, sans-serif";
const INK = '#202124';
const ROYAL = '#174ea6';
const SVG_GUARD = '<svg width="0" height="0" style="display:none;"></svg>';

// ---------------------------------------------------------------------------------------------
// Draw.io builder (same cell conventions as compileOfficialDrawioXml: hdr_title_box, actor_top_user,
// gcp_outer_frame, lbl_* text callouts, rounded arcSize=10 service cards, ellipse step badges)
// ---------------------------------------------------------------------------------------------

function createDrawioBuilder(P) {
  const bgCells = [];
  const edgeCells = [];
  const fgCells = [];
  const vertexBounds = new Map();

  const addVertex = (id, x, y, w, h, rawHtmlValue, style, isBackground = false) => {
    vertexBounds.set(id, { x, y, w, h });
    const cellXml = `        <mxCell id="${id}" value="${P.escXml(rawHtmlValue)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
    (isBackground ? bgCells : fgCells).push(cellXml);
    return id;
  };

  const addPointEdge = (id, srcPt, tgtPt, waypoints = [], opts = {}) => {
    const { dashed = false, startArrow = false, endArrow = true, source, target, strokeColor = INK } = opts;
    const styleParts = [
      'edgeStyle=none',
      'rounded=0',
      'html=1',
      `strokeColor=${strokeColor}`,
      'strokeWidth=2',
      startArrow ? 'startArrow=open;startFill=0;startSize=7' : 'startArrow=none',
      endArrow ? 'endArrow=open;endFill=0;endSize=7' : 'endArrow=none',
    ];
    if (dashed) styleParts.push('dashed=1;dashPattern=3 3');
    const sBox = source ? vertexBounds.get(source) : null;
    const tBox = target ? vertexBounds.get(target) : null;
    if (sBox) {
      styleParts.push(
        `exitX=${Number(((srcPt[0] - sBox.x) / sBox.w).toFixed(4))}`,
        `exitY=${Number(((srcPt[1] - sBox.y) / sBox.h).toFixed(4))}`,
        'exitDx=0',
        'exitDy=0',
        'exitPerimeter=0'
      );
    }
    if (tBox) {
      styleParts.push(
        `entryX=${Number(((tgtPt[0] - tBox.x) / tBox.w).toFixed(4))}`,
        `entryY=${Number(((tgtPt[1] - tBox.y) / tBox.h).toFixed(4))}`,
        'entryDx=0',
        'entryDy=0',
        'entryPerimeter=0'
      );
    }
    const ptsXml =
      waypoints.length > 0
        ? `<Array as="points">${waypoints.map((p) => `<mxPoint x="${p[0]}" y="${p[1]}"/>`).join('')}</Array>`
        : '';
    const srcAttr = source ? ` source="${source}"` : '';
    const tgtAttr = target ? ` target="${target}"` : '';
    edgeCells.push(
      `        <mxCell id="${id}" value="" style="${styleParts.join(';')};" edge="1" parent="1"${srcAttr}${tgtAttr}><mxGeometry relative="1" as="geometry"><mxPoint x="${srcPt[0]}" y="${srcPt[1]}" as="sourcePoint"/><mxPoint x="${tgtPt[0]}" y="${tgtPt[1]}" as="targetPoint"/>${ptsXml}</mxGeometry></mxCell>`
    );
  };

  const fitHtmlLabel = (text, maxW, fontSizePx = 12.5) => {
    const estW = text.length * (fontSizePx * 0.58);
    const scaleX = estW > maxW ? (maxW / estW).toFixed(3) : '1';
    const scaleCss = estW > maxW ? `display:inline-block;transform:scaleX(${scaleX});transform-origin:left center;` : '';
    return `${SVG_GUARD}<b style="font-family:${FONT};font-size:${fontSizePx}px;color:${INK};white-space:nowrap;background-color:#ffffff;padding:0 3px;${scaleCss}">${text}</b>`;
  };

  const addArchCard = (id, x, y, w, h, cardObj) => {
    const iconUri = P.resolveArchIconUri(cardObj.icon, cardObj.title, cardObj.sub);
    const titleFs = String(cardObj.title || '').length > 22 ? '11.2px' : '12.2px';
    const subFs = String(cardObj.sub || '').length > 26 ? '9.6px' : '10.3px';
    const titleHtml = cardObj.title2
      ? `<b style="font-size:${titleFs};color:${INK};word-break:break-word;">${cardObj.title}<br/>${cardObj.title2}</b>`
      : `<b style="font-size:${titleFs};color:${INK};word-break:break-word;">${cardObj.title}</b>`;
    const subHtml = cardObj.sub
      ? `<br/><span style="font-size:${subFs};color:#3c4043;word-break:break-word;">${String(cardObj.sub).replace(/<(?=\d)/g, '&lt;')}</span>`
      : '';
    const htmlVal = `<table style="width:100%;height:100%;border-collapse:collapse;font-family:${FONT};table-layout:fixed;"><tr><td style="width:42px;text-align:center;vertical-align:middle;padding-left:4px;"><img src="${iconUri}" width="32" height="32"/></td><td style="text-align:left;vertical-align:middle;padding-left:5px;padding-right:4px;line-height:1.18;overflow-wrap:anywhere;">${titleHtml}${subHtml}</td></tr></table>`;
    return addVertex(
      id,
      x,
      y,
      w,
      h,
      htmlVal,
      'rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=left;verticalAlign=middle;spacingLeft=2;spacingRight=4;'
    );
  };

  // Tenant partition chip (drawn INSIDE a shared card — the visual proof of logical, not physical, isolation)
  const addChip = (id, x, y, w, h, text, fill, stroke, fontColor = INK) =>
    addVertex(
      id,
      x,
      y,
      w,
      h,
      `${SVG_GUARD}<b style="font-family:${FONT};font-size:10.5px;color:${fontColor};">${text}</b>`,
      `rounded=1;arcSize=30;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=1.2;align=center;verticalAlign=middle;`
    );

  const badgeStyle =
    'ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#174ea6;strokeColor=#174ea6;fontColor=#ffffff;fontStyle=1;fontSize=14;align=center;verticalAlign=middle;';
  const addStepBadge = (id, cx, cy, num) => addVertex(id, cx - 17, cy - 17, 34, 34, `${SVG_GUARD}<b>${num}</b>`, badgeStyle);

  const addCalloutText = (id, x, y, w, h, lines, align = 'left', fontSizePx = 12.5, bold = false) => {
    const html = `${SVG_GUARD}<div style="font-family:${FONT};font-size:${fontSizePx}px;color:${INK};line-height:1.25;${bold ? 'font-weight:700;' : ''}">${lines.join('<br/>')}</div>`;
    return addVertex(id, x, y, w, h, html, `text;whiteSpace=wrap;html=1;strokeColor=none;fillColor=none;align=${align};verticalAlign=middle;`);
  };

  const addZone = (id, x, y, w, h, fill, title, sub, isBackground = true) =>
    addVertex(
      id,
      x,
      y,
      w,
      h,
      `${SVG_GUARD}<div style="font-family:${FONT};line-height:1.25;"><b style="font-size:14.5px;color:${INK};background-color:${fill};padding:0 2px;">${title}</b>${sub ? `<br/><span style="font-size:12.5px;color:${INK};background-color:${fill};padding:0 2px;">${sub}</span>` : ''}</div>`,
      `rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;`,
      isBackground
    );

  const addWrapper = (id, x, y, w, h, label, maxLabelW) =>
    addVertex(
      id,
      x,
      y,
      w,
      h,
      fitHtmlLabel(label, maxLabelW, 12),
      'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=1.2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;',
      true
    );

  const addCommonHeader = (bp, actorTitle, actorSub) => {
    addVertex(
      'hdr_title_box',
      20,
      6,
      1160,
      40,
      `${SVG_GUARD}<div style="font-family:${FONT};line-height:1.35;"><b style="font-size:12.5px;color:${ROYAL};">[${bp.badge}] ${bp.title}</b><br/><span style="font-size:11px;color:#5f6368;">${bp.subtitle}</span></div>`,
      'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=0;spacingTop=0;',
      true
    );
    addVertex(
      'actor_top_user',
      465,
      52,
      250,
      86,
      `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:${FONT};text-align:center;"><img src="${P.USER_SILHOUETTE_DATA_URI}" width="36" height="28"/><b style="font-size:13px;color:${INK};">${actorTitle}</b><br/><span style="font-size:10.5px;color:#3c4043;">${actorSub}</span></div>`,
      'rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=center;verticalAlign=middle;',
      true
    );
    addVertex('gcp_outer_frame', 20, 218, 1160, 1172, '', 'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#1a73e8;strokeColor=#202124;strokeWidth=1.2;', true);
    addVertex(
      'gcp_wordmark',
      36,
      228,
      150,
      30,
      `<img src="${P.OFFICIAL_ASSETS.gcp_wordmark_white}" width="138" height="25"/>`,
      'text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;',
      true
    );
  };

  const finish = (bp) => {
    const cells = [...bgCells, ...edgeCells, ...fgCells];
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="embed.diagrams.net" modified="2026-10-14T00:00:00.000Z" agent="PromptCanvas-Vision-Decompiler-v4.0" version="24.7.5" type="device">
  <diagram id="${bp.id}" name="${P.escXml(bp.title)}">
    <mxGraphModel dx="1200" dy="1410" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="1410" background="#FFFFFF" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  };

  return { addVertex, addPointEdge, addArchCard, addChip, addStepBadge, addCalloutText, addZone, addWrapper, addCommonHeader, finish, vertexBounds };
}

// ---------------------------------------------------------------------------------------------
// SVG primitives shared by both layouts
// ---------------------------------------------------------------------------------------------

function svgText(x, y, text, { size = 13.5, weight = 400, fill = INK, anchor = 'start', halo, fit = '' } = {}, P) {
  const haloAttr = halo ? ` paint-order="stroke fill" stroke="${halo}" stroke-width="8" stroke-linejoin="round"` : '';
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}"${haloAttr}${fit}>${P.escXml(text)}</text>`;
}

function svgArrow(points, { dashed = false, start = false, end = true } = {}) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2"${dashed ? ' stroke-dasharray="6,6"' : ''}${start ? ' marker-start="url(#arrow)"' : ''}${end ? ' marker-end="url(#arrow)"' : ''}/>`;
}

function svgChip(x, y, w, h, text, fill, stroke, P, fontColor = INK) {
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(14, h / 2)}" ry="${Math.min(14, h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>${svgText(x + w / 2, y + h / 2 + 4, text, { size: 10.5, weight: 700, anchor: 'middle', fill: fontColor }, P)}</g>`;
}

function svgHeader(bp, actorTitle, actorSub, P) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 1 1.5 L 8 5 L 1 8.5" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>
  ${svgText(20, 22, `[${bp.badge}] ${bp.title}`, { size: 13, weight: 700, fill: ROYAL, fit: P.fitAttr(`[${bp.badge}] ${bp.title}`, 1150, 7.5) }, P)}
  ${svgText(20, 40, bp.subtitle, { size: 11.5, fill: '#5f6368', fit: P.fitAttr(bp.subtitle, 1150, 6.4) }, P)}
  <g>
    <rect x="465" y="52" width="250" height="86" rx="8" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <circle cx="590" cy="76" r="9.5" fill="#000000"/>
    <path d="M 573 101 C 573 91 607 91 607 101 Z" fill="#000000"/>
    ${svgText(590, 117, actorTitle, { size: 13.5, weight: 700, anchor: 'middle' }, P)}
    ${svgText(590, 132, actorSub, { size: 11, fill: '#3c4043', anchor: 'middle' }, P)}
  </g>
  <rect x="20" y="218" width="1160" height="1172" rx="18" ry="18" fill="#1a73e8" stroke="${INK}" stroke-width="1.2"/>
  <image x="38" y="232" width="138" height="25" preserveAspectRatio="xMidYMid meet" xlink:href="${P.OFFICIAL_ASSETS.gcp_wordmark_white}"/>`;
}

// =============================================================================================
// LAYOUT 1 — `pooled-shared-plane` (WS2 • Pattern A)
// =============================================================================================
//
// Spec fields (in addition to badge/title/subtitle/topUserTitle/topUserSub/routingCards/govCards/…):
//   sharedPlaneLabel, runtimeZoneTitle, runtimeZoneSub, dataZoneTitle, dataZoneSub,
//   runtimeCards: { modelArmor, runtime, llm, valkey, memory: {title, sub, chips:[{text, fill, stroke}], footnote, footnote2} }
//   dataCards:    { db: {title, sub, policy, chips:[...], footnote}, bq, mcp, sdp, kms }
//   stepLabels:   { s3:[..], s4:[..], s5:[..], s6:[..], s7:[..], gov:[..], mem:[..], mcp:[..] }

const POOL = {
  hub: { x: 68, y: 338, w: 664, h: 330 },
  gov: { x: 798, y: 346, w: 328, h: 320 },
  wrapper: { x: 70, y: 772, w: 1060, h: 560 },
  runtime: { x: 86, y: 808, w: 512, h: 508 },
  data: { x: 614, y: 808, w: 500, h: 508 },
  ma: { x: 100, y: 868, w: 206, h: 72 },
  run: { x: 366, y: 868, w: 218, h: 74 },
  llm: { x: 100, y: 980, w: 206, h: 72 },
  valkey: { x: 366, y: 980, w: 218, h: 74 },
  mem: { x: 100, y: 1102, w: 484, h: 192 },
  db: { x: 628, y: 874, w: 472, h: 190 },
  bq: { x: 628, y: 1096, w: 224, h: 74 },
  mcp: { x: 876, y: 1096, w: 224, h: 74 },
  sdp: { x: 628, y: 1200, w: 224, h: 74 },
  kms: { x: 876, y: 1200, w: 224, h: 74 },
};

function hubTopSvg(bp, P) {
  const rc = bp.routingCards;
  const gc = bp.govCards;
  const C = P.renderArchCardSvg;
  const S = P.renderStepCircleSvg;
  return `
  <rect x="36" y="268" width="1128" height="1104" rx="14" ry="14" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
  <rect x="52" y="304" width="1096" height="1050" rx="14" ry="14" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
  <rect x="${POOL.hub.x}" y="${POOL.hub.y}" width="${POOL.hub.w}" height="${POOL.hub.h}" rx="6" ry="6" fill="#aecbfa" stroke="${INK}" stroke-width="1"/>
  ${C({ x: 88, y: 398, w: 204, h: 66, iconKey: rc.topLeft.icon, title: rc.topLeft.title, sub: rc.topLeft.sub })}
  ${C({ x: 88, y: 482, w: 204, h: 66, iconKey: rc.midLeft.icon, title: rc.midLeft.title, sub: rc.midLeft.sub })}
  ${C({ x: 96, y: 580, w: 196, h: 66, iconKey: rc.botLeft.icon, title: rc.botLeft.title, sub: rc.botLeft.sub })}
  ${C({ x: 452, y: 432, w: 262, h: 76, iconKey: rc.topRight.icon, title: rc.topRight.title, title2: rc.topRight.title2, sub: rc.topRight.sub })}
  ${C({ x: 476, y: 580, w: 224, h: 66, iconKey: rc.botRight.icon, title: rc.botRight.title, sub: rc.botRight.sub })}
  ${svgArrow([[566, 138], [566, 430]])}
  ${svgArrow([[612, 432], [612, 140]])}
  ${svgText(536, 185, bp.step1LeftLabel, { size: 14, anchor: 'end' }, P)}
  ${S(566, 180, '1')}
  ${S(612, 180, '7')}
  ${svgText(640, 185, bp.step7RightLabel, { size: 14 }, P)}
  ${svgArrow([[452, 456], [418, 456], [418, 431], [294, 431]], { start: true })}
  ${svgArrow([[452, 484], [418, 484], [418, 515], [294, 515]], { start: true })}
  ${svgText(355, 408, rc.edgeTopLeft[0], { anchor: 'middle' }, P)}
  ${svgText(355, 425, rc.edgeTopLeft[1], { anchor: 'middle' }, P)}
  ${svgText(355, 534, rc.edgeMidLeft[0], { anchor: 'middle' }, P)}
  ${svgText(355, 551, rc.edgeMidLeft[1], { anchor: 'middle' }, P)}
  ${svgArrow([[294, 613], [474, 613]], { start: true })}
  ${svgText(384, 590, rc.edgeBotLeft[0], { anchor: 'middle' }, P)}
  ${svgText(384, 607, rc.edgeBotLeft[1], { anchor: 'middle' }, P)}
  ${svgArrow([[566, 508], [566, 578]])}
  ${svgArrow([[612, 580], [612, 510]])}
  ${svgText(536, 548, rc.step2Left, { size: 14, anchor: 'end' }, P)}
  ${S(566, 543, '2')}
  ${S(612, 543, '7')}
  ${svgText(640, 548, rc.step7Mid, { size: 14 }, P)}
  <rect x="${POOL.gov.x}" y="${POOL.gov.y}" width="${POOL.gov.w}" height="${POOL.gov.h}" rx="6" ry="6" fill="#ceead6" stroke="${INK}" stroke-width="1"/>
  ${svgText(816, 372, bp.govHubTitle, { size: 15, weight: 700 }, P)}
  ${svgText(816, 390, bp.govHubTitle2, { size: 15, weight: 700 }, P)}
  ${C({ x: 824, y: 406, w: 276, h: 72, iconKey: gc.top.icon, title: gc.top.title, title2: gc.top.title2, sub: gc.top.sub })}
  ${C({ x: 830, y: 492, w: 264, h: 68, iconKey: gc.mid.icon, title: gc.mid.title, sub: gc.mid.sub })}
  ${C({ x: 828, y: 574, w: 268, h: 68, iconKey: gc.bot.icon, title: gc.bot.title, sub: gc.bot.sub })}
  ${svgText(52, 291, bp.outerWrapperLabel, { weight: 700, halo: '#ffffff', fit: P.fitAttr(bp.outerWrapperLabel, 1090, 7.6) }, P)}
  ${svgText(68, 327, bp.innerWrapperLabel, { weight: 700, halo: '#ffffff', fit: P.fitAttr(bp.innerWrapperLabel, 1060, 7.6) }, P)}
  ${svgText(84, 363, bp.routingHubTitle, { size: 15, weight: 700, halo: '#aecbfa' }, P)}
  ${svgText(84, 381, bp.routingHubSub, { size: 13, halo: '#aecbfa' }, P)}`;
}

function hubTopDrawio(B, bp) {
  const rc = bp.routingCards;
  const gc = bp.govCards;
  B.addWrapper('wrapper_shared_hubs', 36, 268, 1128, 1104, bp.outerWrapperLabel, 1090);
  B.addWrapper('wrapper_vpc', 52, 304, 1096, 1050, bp.innerWrapperLabel, 1060);
  B.addZone('zone_routing_hub', POOL.hub.x, POOL.hub.y, POOL.hub.w, POOL.hub.h, '#aecbfa', bp.routingHubTitle, bp.routingHubSub);
  B.addVertex(
    'zone_gov_hub',
    POOL.gov.x,
    POOL.gov.y,
    POOL.gov.w,
    POOL.gov.h,
    `${SVG_GUARD}<div style="font-family:${FONT};line-height:1.25;"><b style="font-size:14.5px;color:${INK};">${bp.govHubTitle}<br/>${bp.govHubTitle2}</b></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ceead6;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;',
    true
  );
  B.addArchCard('card_rc_topleft', 88, 398, 204, 66, rc.topLeft);
  B.addArchCard('card_rc_midleft', 88, 482, 204, 66, rc.midLeft);
  B.addArchCard('card_rc_botleft', 96, 580, 196, 66, rc.botLeft);
  B.addArchCard('card_rc_alb', 452, 432, 262, 76, rc.topRight);
  B.addArchCard('card_rc_cloudrun', 476, 580, 224, 66, rc.botRight);
  B.addArchCard('card_gc_top', 824, 406, 276, 72, gc.top);
  B.addArchCard('card_gc_mid', 830, 492, 264, 68, gc.mid);
  B.addArchCard('card_gc_bot', 828, 574, 268, 68, gc.bot);
  B.addStepBadge('step_1_top', 566, 180, '1');
  B.addCalloutText('lbl_step1_top', 450, 166, 92, 28, [bp.step1LeftLabel], 'right');
  B.addStepBadge('step_7_top', 612, 180, '7');
  B.addCalloutText('lbl_step7_top', 634, 166, 102, 28, [bp.step7RightLabel], 'left');
  B.addCalloutText('lbl_rc_top', 300, 386, 114, 34, rc.edgeTopLeft, 'center');
  B.addCalloutText('lbl_rc_mid', 300, 524, 114, 34, rc.edgeMidLeft, 'center');
  B.addCalloutText('lbl_rc_bot', 306, 568, 156, 34, rc.edgeBotLeft, 'center');
  B.addStepBadge('step_2_mid', 566, 543, '2');
  B.addCalloutText('lbl_step2_mid', 450, 529, 92, 28, [rc.step2Left], 'right');
  B.addStepBadge('step_7_mid', 612, 543, '7');
  B.addCalloutText('lbl_step7_mid', 634, 529, 102, 28, [rc.step7Mid], 'left');
  B.addPointEdge('e_user_to_alb', [566, 138], [566, 430], [], { source: 'actor_top_user', target: 'card_rc_alb' });
  B.addPointEdge('e_alb_to_user', [612, 432], [612, 140], [], { source: 'card_rc_alb', target: 'actor_top_user' });
  B.addPointEdge('e_alb_to_top_left', [452, 456], [292, 431], [[418, 456], [418, 431]], { startArrow: true, source: 'card_rc_alb', target: 'card_rc_topleft' });
  B.addPointEdge('e_alb_to_mid_left', [452, 484], [292, 515], [[418, 484], [418, 515]], { startArrow: true, source: 'card_rc_alb', target: 'card_rc_midleft' });
  B.addPointEdge('e_iap_to_cloudrun', [292, 613], [476, 613], [], { startArrow: true, source: 'card_rc_botleft', target: 'card_rc_cloudrun' });
  B.addPointEdge('e_alb_to_crun', [566, 508], [566, 580], [], { source: 'card_rc_alb', target: 'card_rc_cloudrun' });
  B.addPointEdge('e_crun_to_alb', [612, 580], [612, 508], [], { source: 'card_rc_cloudrun', target: 'card_rc_alb' });
}

export function compilePooledSharedPlaneSvg(bp, P) {
  const C = P.renderArchCardSvg;
  const S = P.renderStepCircleSvg;
  const r = bp.runtimeCards;
  const d = bp.dataCards;
  const st = bp.stepLabels;
  const K = POOL;
  const chipRow = (chips, yTop, startX, chipW, chipH, gap) =>
    chips.map((c, i) => svgChip(startX + i * (chipW + gap), yTop, chipW, chipH, c.text, c.fill, c.stroke, P, c.fontColor)).join('');

  return `${svgHeader(bp, bp.topUserTitle, bp.topUserSub, P)}
  ${hubTopSvg(bp, P)}

  <!-- ONE SHARED PLANE (no per-tenant wrappers) -->
  <rect x="${K.wrapper.x}" y="${K.wrapper.y}" width="${K.wrapper.w}" height="${K.wrapper.h}" rx="8" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
  <rect x="${K.runtime.x}" y="${K.runtime.y}" width="${K.runtime.w}" height="${K.runtime.h}" rx="6" ry="6" fill="#feefc3" stroke="${INK}" stroke-width="1"/>
  <rect x="${K.data.x}" y="${K.data.y}" width="${K.data.w}" height="${K.data.h}" rx="6" ry="6" fill="#fad2cf" stroke="${INK}" stroke-width="1"/>

  <!-- Zone 3: shared runtime -->
  ${C({ x: K.ma.x, y: K.ma.y, w: K.ma.w, h: K.ma.h, iconKey: r.modelArmor.icon, title: r.modelArmor.title, sub: r.modelArmor.sub })}
  ${C({ x: K.run.x, y: K.run.y, w: K.run.w, h: K.run.h, iconKey: r.runtime.icon, title: r.runtime.title, sub: r.runtime.sub })}
  ${C({ x: K.llm.x, y: K.llm.y, w: K.llm.w, h: K.llm.h, iconKey: r.llm.icon, title: r.llm.title, sub: r.llm.sub })}
  ${C({ x: K.valkey.x, y: K.valkey.y, w: K.valkey.w, h: K.valkey.h, iconKey: r.valkey.icon, title: r.valkey.title, sub: r.valkey.sub })}
  <g>
    <rect x="${K.mem.x}" y="${K.mem.y}" width="${K.mem.w}" height="${K.mem.h}" rx="6" ry="6" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <image x="${K.mem.x + 12}" y="${K.mem.y + 14}" width="32" height="32" preserveAspectRatio="xMidYMid meet" xlink:href="${P.resolveArchIconUri(r.memory.icon, r.memory.title, r.memory.sub)}"/>
    ${svgText(K.mem.x + 54, K.mem.y + 30, r.memory.title, { size: 13.5, weight: 700 }, P)}
    ${svgText(K.mem.x + 54, K.mem.y + 48, r.memory.sub, { size: 11.5, fill: '#3c4043', fit: P.fitAttr(r.memory.sub, K.mem.w - 70, 6.2) }, P)}
    ${chipRow(r.memory.chips, K.mem.y + 68, K.mem.x + 14, 146, 30, 9)}
    ${svgText(K.mem.x + 14, K.mem.y + 126, r.memory.footnote, { size: 11, fill: '#3c4043', fit: P.fitAttr(r.memory.footnote, K.mem.w - 28, 5.9) }, P)}
    ${svgText(K.mem.x + 14, K.mem.y + 144, r.memory.footnote2 || '', { size: 11, fill: '#3c4043', fit: P.fitAttr(r.memory.footnote2 || '', K.mem.w - 28, 5.9) }, P)}
  </g>

  <!-- Zone 4: shared data & tool plane -->
  <g>
    <rect x="${K.db.x}" y="${K.db.y}" width="${K.db.w}" height="${K.db.h}" rx="6" ry="6" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <image x="${K.db.x + 12}" y="${K.db.y + 14}" width="32" height="32" preserveAspectRatio="xMidYMid meet" xlink:href="${P.resolveArchIconUri(d.db.icon, d.db.title, d.db.sub)}"/>
    ${svgText(K.db.x + 54, K.db.y + 30, d.db.title, { size: 13.5, weight: 700 }, P)}
    ${svgText(K.db.x + 54, K.db.y + 48, d.db.sub, { size: 11.5, fill: '#3c4043', fit: P.fitAttr(d.db.sub, K.db.w - 70, 6.2) }, P)}
    ${chipRow(d.db.chips, K.db.y + 70, K.db.x + 14, 214, 32, 16)}
    ${svgChip(K.db.x + 14, K.db.y + 114, K.db.w - 28, 28, d.db.policy, '#e8f0fe', '#174ea6', P, '#174ea6')}
    ${svgText(K.db.x + 14, K.db.y + 166, d.db.footnote, { size: 11, fill: '#3c4043', fit: P.fitAttr(d.db.footnote, K.db.w - 28, 5.9) }, P)}
  </g>
  ${C({ x: K.bq.x, y: K.bq.y, w: K.bq.w, h: K.bq.h, iconKey: d.bq.icon, title: d.bq.title, sub: d.bq.sub })}
  ${C({ x: K.mcp.x, y: K.mcp.y, w: K.mcp.w, h: K.mcp.h, iconKey: d.mcp.icon, title: d.mcp.title, sub: d.mcp.sub })}
  ${C({ x: K.sdp.x, y: K.sdp.y, w: K.sdp.w, h: K.sdp.h, iconKey: d.sdp.icon, title: d.sdp.title, sub: d.sdp.sub })}
  ${C({ x: K.kms.x, y: K.kms.y, w: K.kms.w, h: K.kms.h, iconKey: d.kms.icon, title: d.kms.title, sub: d.kms.sub })}

  <!-- Flow: ③ hub → runtime, ④ Model Armor ↔ Agent Engine, ⑤ Gemini/cache ↔ Agent Engine, memory, ⑥ Agent Engine → AlloyDB (RLS) & MCP, ⑦ SDP → hub -->
  ${svgArrow([[586, 646], [586, 740], [475, 740], [475, 866]])}
  ${S(372, 700, '3')}
  ${svgText(400, 695, st.s3[0], {}, P)}
  ${svgText(400, 713, st.s3[1], {}, P)}
  ${svgArrow([[K.ma.x + K.ma.w, 904], [K.run.x, 904]], { start: true })}
  ${S(120, 960, '4')}
  ${svgText(148, 956, st.s4[0], {}, P)}
  ${svgText(148, 973, st.s4[1], {}, P)}
  ${svgArrow([[K.llm.x + K.llm.w, 1016], [K.run.x, 1016]], { start: true })}
  ${S(120, 1076, '5')}
  ${svgText(148, 1072, st.s5[0], {}, P)}
  ${svgText(148, 1089, st.s5[1], {}, P)}
  ${svgArrow([[475, 942], [475, 978]])}
  ${svgArrow([[475, 1054], [475, 1100]], { start: true })}
  ${svgText(500, 1082, st.mem[0], { size: 12.5 }, P)}
  ${svgArrow([[K.run.x + K.run.w, 896], [K.db.x, 896]])}
  ${S(606, 896, '6')}
  ${svgArrow([[K.db.x + 112, K.db.y + K.db.h], [K.db.x + 112, K.bq.y]])}
  ${svgArrow([[K.mcp.x + 112, K.mcp.y], [K.mcp.x + 112, K.db.y + K.db.h]], { start: true, end: false })}
  ${svgText(K.mcp.x + 118, K.db.y + K.db.h + 20, st.mcp[0], { size: 11.5 }, P)}
  ${svgArrow([[K.bq.x + 112, K.bq.y + K.bq.h], [K.bq.x + 112, K.sdp.y]])}
  ${svgArrow([[K.mcp.x + 112, K.mcp.y + K.mcp.h], [K.mcp.x + 112, K.kms.y]])}
  ${svgArrow([[K.sdp.x + 112, K.sdp.y + K.sdp.h], [K.sdp.x + 112, 1296], [1122, 1296], [1122, 708], [676, 708], [676, 648]], { end: true })}
  ${S(956, 738, '7')}
  ${svgText(980, 733, st.s7[0], { size: 11.5, anchor: 'start' }, P)}
  ${svgText(980, 749, st.s7[1], { size: 11.5, anchor: 'start' }, P)}
  ${svgArrow([[932, 668], [932, 752], [340, 752], [340, 806]], { dashed: true, start: false, end: true })}
  ${svgArrow([[932, 752], [932, 806]], { dashed: true, end: true })}
  ${svgText(740, 745, st.gov[0], { size: 12.5, anchor: 'middle' }, P)}

  <!-- Foreground labels with halos -->
  ${svgText(86, 795, bp.sharedPlaneLabel, { size: 13, weight: 700, halo: '#ffffff', fit: P.fitAttr(bp.sharedPlaneLabel, 1030, 7.3) }, P)}
  ${svgText(104, 834, bp.runtimeZoneTitle, { size: 15, weight: 700, halo: '#feefc3' }, P)}
  ${svgText(104, 852, bp.runtimeZoneSub, { size: 13, halo: '#feefc3', fit: P.fitAttr(bp.runtimeZoneSub, 480, 7.0) }, P)}
  ${svgText(632, 834, bp.dataZoneTitle, { size: 15, weight: 700, halo: '#fad2cf' }, P)}
  ${svgText(632, 852, bp.dataZoneSub, { size: 13, halo: '#fad2cf', fit: P.fitAttr(bp.dataZoneSub, 470, 7.0) }, P)}
</svg>`;
}

export function compilePooledSharedPlaneDrawio(bp, P) {
  const B = createDrawioBuilder(P);
  const r = bp.runtimeCards;
  const d = bp.dataCards;
  const st = bp.stepLabels;
  const K = POOL;

  B.addCommonHeader(bp, bp.topUserTitle, bp.topUserSub);
  hubTopDrawio(B, bp);

  B.addWrapper('wrapper_shared_plane', K.wrapper.x, K.wrapper.y, K.wrapper.w, K.wrapper.h, bp.sharedPlaneLabel, 1030);
  B.addZone('zone_pool_runtime', K.runtime.x, K.runtime.y, K.runtime.w, K.runtime.h, '#feefc3', bp.runtimeZoneTitle, bp.runtimeZoneSub);
  B.addZone('zone_pool_data', K.data.x, K.data.y, K.data.w, K.data.h, '#fad2cf', bp.dataZoneTitle, bp.dataZoneSub);

  // Zone 3 — ONE shared runtime
  B.addArchCard('card_pool_ma', K.ma.x, K.ma.y, K.ma.w, K.ma.h, r.modelArmor);
  B.addArchCard('card_pool_run', K.run.x, K.run.y, K.run.w, K.run.h, r.runtime);
  B.addArchCard('card_pool_llm', K.llm.x, K.llm.y, K.llm.w, K.llm.h, r.llm);
  B.addArchCard('card_pool_valkey', K.valkey.x, K.valkey.y, K.valkey.w, K.valkey.h, r.valkey);
  B.addVertex(
    'card_pool_mem',
    K.mem.x,
    K.mem.y,
    K.mem.w,
    K.mem.h,
    `<table style="width:100%;border-collapse:collapse;font-family:${FONT};table-layout:fixed;"><tr><td style="width:42px;text-align:center;vertical-align:top;padding:6px 0 0 6px;"><img src="${P.resolveArchIconUri(r.memory.icon, r.memory.title, r.memory.sub)}" width="32" height="32"/></td><td style="text-align:left;vertical-align:top;padding:8px 6px 0 6px;line-height:1.2;"><b style="font-size:12.2px;color:${INK};">${r.memory.title}</b><br/><span style="font-size:10.3px;color:#3c4043;">${r.memory.sub}</span></td></tr></table>`,
    'rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=left;verticalAlign=top;spacingLeft=0;spacingTop=0;'
  );
  r.memory.chips.forEach((c, i) => B.addChip(`chip_mem_${i}`, K.mem.x + 14 + i * 155, K.mem.y + 68, 146, 30, c.text, c.fill, c.stroke, c.fontColor));
  B.addCalloutText('lbl_mem_foot', K.mem.x + 12, K.mem.y + 106, K.mem.w - 24, 54, [r.memory.footnote, r.memory.footnote2 || ''], 'left', 9.5);

  // Zone 4 — ONE shared data & tool plane
  B.addVertex(
    'card_pool_db',
    K.db.x,
    K.db.y,
    K.db.w,
    K.db.h,
    `<table style="width:100%;border-collapse:collapse;font-family:${FONT};table-layout:fixed;"><tr><td style="width:42px;text-align:center;vertical-align:top;padding:6px 0 0 6px;"><img src="${P.resolveArchIconUri(d.db.icon, d.db.title, d.db.sub)}" width="32" height="32"/></td><td style="text-align:left;vertical-align:top;padding:8px 6px 0 6px;line-height:1.2;"><b style="font-size:12.2px;color:${INK};">${d.db.title}</b><br/><span style="font-size:10.3px;color:#3c4043;">${d.db.sub}</span></td></tr></table>`,
    'rounded=1;arcSize=6;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=left;verticalAlign=top;spacingLeft=0;spacingTop=0;'
  );
  d.db.chips.forEach((c, i) => B.addChip(`chip_db_${i}`, K.db.x + 14 + i * 230, K.db.y + 70, 214, 32, c.text, c.fill, c.stroke, c.fontColor));
  B.addChip('chip_db_policy', K.db.x + 14, K.db.y + 114, K.db.w - 28, 28, d.db.policy, '#e8f0fe', '#174ea6', '#174ea6');
  B.addCalloutText('lbl_db_foot', K.db.x + 12, K.db.y + 148, K.db.w - 24, 32, [d.db.footnote], 'left', 9.5);
  B.addArchCard('card_pool_bq', K.bq.x, K.bq.y, K.bq.w, K.bq.h, d.bq);
  B.addArchCard('card_pool_mcp', K.mcp.x, K.mcp.y, K.mcp.w, K.mcp.h, d.mcp);
  B.addArchCard('card_pool_sdp', K.sdp.x, K.sdp.y, K.sdp.w, K.sdp.h, d.sdp);
  B.addArchCard('card_pool_kms', K.kms.x, K.kms.y, K.kms.w, K.kms.h, d.kms);

  // Steps & callouts
  B.addStepBadge('step_3_trunk', 372, 700, '3');
  B.addCalloutText('lbl_step3_trunk', 394, 680, 170, 36, st.s3, 'left');
  B.addStepBadge('step_4_left', 120, 960, '4');
  B.addCalloutText('lbl_step4_left', 144, 946, 158, 34, st.s4, 'left');
  B.addStepBadge('step_5_left', 120, 1076, '5');
  B.addCalloutText('lbl_step5_left', 144, 1062, 158, 34, st.s5, 'left');
  B.addCalloutText('lbl_mem_link', 494, 1068, 96, 26, st.mem, 'left');
  B.addStepBadge('step_6_data', 606, 896, '6');
  B.addCalloutText('lbl_mcp_link', K.mcp.x + 116, K.db.y + K.db.h + 4, 110, 26, st.mcp, 'left', 11.5);
  B.addStepBadge('step_7_resp', 956, 738, '7');
  B.addCalloutText('lbl_step7_resp', 978, 720, 142, 34, st.s7, 'left', 11.5);
  B.addCalloutText('lbl_gov_trunk', 590, 724, 320, 24, st.gov, 'center', 11.5);

  // Edges
  B.addPointEdge('e_trunk_crun_to_pool', [586, 646], [475, 866], [[586, 740], [475, 740]], { source: 'card_rc_cloudrun', target: 'card_pool_run' });
  B.addPointEdge('e_pool_ma_run', [K.ma.x + K.ma.w, 904], [K.run.x, 904], [], { startArrow: true, source: 'card_pool_ma', target: 'card_pool_run' });
  B.addPointEdge('e_pool_llm_run', [K.llm.x + K.llm.w, 1016], [K.run.x, 1016], [], { startArrow: true, source: 'card_pool_llm', target: 'card_pool_run' });
  B.addPointEdge('e_pool_run_valkey', [475, 942], [475, 978], [], { source: 'card_pool_run', target: 'card_pool_valkey' });
  B.addPointEdge('e_pool_valkey_mem', [475, 1054], [475, 1100], [], { startArrow: true, source: 'card_pool_valkey', target: 'card_pool_mem' });
  B.addPointEdge('e_pool_run_db', [K.run.x + K.run.w, 896], [K.db.x, 896], [], { source: 'card_pool_run', target: 'card_pool_db' });
  B.addPointEdge('e_pool_db_bq', [K.db.x + 112, K.db.y + K.db.h], [K.db.x + 112, K.bq.y], [], { source: 'card_pool_db', target: 'card_pool_bq' });
  B.addPointEdge('e_pool_db_mcp', [K.mcp.x + 112, K.mcp.y], [K.mcp.x + 112, K.db.y + K.db.h], [], { startArrow: true, endArrow: false, source: 'card_pool_mcp', target: 'card_pool_db' });
  B.addPointEdge('e_pool_bq_sdp', [K.bq.x + 112, K.bq.y + K.bq.h], [K.bq.x + 112, K.sdp.y], [], { source: 'card_pool_bq', target: 'card_pool_sdp' });
  B.addPointEdge('e_pool_mcp_kms', [K.mcp.x + 112, K.mcp.y + K.mcp.h], [K.mcp.x + 112, K.kms.y], [], { source: 'card_pool_mcp', target: 'card_pool_kms' });
  B.addPointEdge('e_pool_sdp_resp', [K.sdp.x + 112, K.sdp.y + K.sdp.h], [676, 646], [[K.sdp.x + 112, 1296], [1122, 1296], [1122, 708], [676, 708]], { source: 'card_pool_sdp', target: 'card_rc_cloudrun' });
  B.addPointEdge('e_gov_dashed_runtime', [932, 668], [340, 806], [[932, 752], [340, 752]], { dashed: true, source: 'zone_gov_hub', target: 'zone_pool_runtime' });
  B.addPointEdge('e_gov_dashed_data', [932, 752], [932, 806], [], { dashed: true, source: 'zone_gov_hub', target: 'zone_pool_data' });

  return B.finish(bp);
}

// =============================================================================================
// LAYOUT 2 — `decision-tree-3-outcome` (WS5 • Executive Topology Decision Guide & Agentic Triad)
// =============================================================================================
//
// Spec fields:
//   topUserTitle/topUserSub (decision makers), outerWrapperLabel, step1Label,
//   selectorTitle, selectorSub, inputs: {icon,title,sub}, q1: {title, body[]}, q2: {title, body[]},
//   q1Yes[2], q1No, q2Single[2], q2Multi[2], triadApplies[2]  (edge labels),
//   triadTitle, triadTitle2, triadCards: [c1, c2, c3], coreBar: {title},
//   outcomes: [ {key:'B'|'A'|'C', fill, accent, label, zoneTitle, zoneSub, cards:[4], verdict:[2], step:'4'|'5'|'6'} ] (left→right)

const TREE = {
  sel: { x: 68, y: 338, w: 664, h: 330 },
  gov: { x: 798, y: 346, w: 328, h: 320 },
  inputs: { x: 108, y: 388, w: 592, h: 58 },
  q1: { x: 112, y: 474, w: 258, h: 100 },
  q2: { x: 426, y: 474, w: 260, h: 100 },
  bar: { x: 70, y: 724, w: 1060, h: 28 },
  outcomeY: 798,
  outcomeH: 534,
  outcomeW: 340,
  outcomeXs: [70, 430, 790],
  cardW: 300,
  cardH: 68,
  cardYs: [880, 962, 1044, 1126],
  verdictY: 1216,
  verdictH: 64,
};

export function compileDecisionTreeSvg(bp, P) {
  const C = P.renderArchCardSvg;
  const S = P.renderStepCircleSvg;
  const T = TREE;
  const triad = bp.triadCards;
  const outcomesSvg = bp.outcomes
    .map((o, i) => {
      const ox = T.outcomeXs[i];
      const zx = ox + 16;
      const zw = T.outcomeW - 32;
      const cx = ox + 20;
      const cards = o.cards
        .map((c, j) => C({ x: cx, y: T.cardYs[j], w: T.cardW, h: T.cardH, iconKey: c.icon, title: c.title, sub: c.sub }))
        .join('');
      const links = [0, 1, 2].map((j) => svgArrow([[cx + 40, T.cardYs[j] + T.cardH], [cx + 40, T.cardYs[j + 1]]])).join('');
      return `
  <rect x="${ox}" y="${T.outcomeY}" width="${T.outcomeW}" height="${T.outcomeH}" rx="8" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>
  <rect x="${zx}" y="${T.outcomeY + 34}" width="${zw}" height="${T.outcomeH - 50}" rx="6" ry="6" fill="${o.fill}" stroke="${INK}" stroke-width="1"/>
  ${cards}
  ${links}
  <g>
    <rect x="${cx}" y="${T.verdictY}" width="${T.cardW}" height="${T.verdictH}" rx="8" ry="8" fill="#ffffff" stroke="${o.accent}" stroke-width="2"/>
    ${svgText(cx + T.cardW / 2, T.verdictY + 24, o.verdict[0], { size: 12.5, weight: 700, anchor: 'middle', fill: o.accent, fit: P.fitAttr(o.verdict[0], T.cardW - 16, 7.0) }, P)}
    ${svgText(cx + T.cardW / 2, T.verdictY + 44, o.verdict[1], { size: 11, anchor: 'middle', fill: '#3c4043', fit: P.fitAttr(o.verdict[1], T.cardW - 16, 6.0) }, P)}
  </g>
  ${svgText(ox + 16, T.outcomeY + 22, o.label, { size: 13, weight: 700, halo: '#ffffff', fit: P.fitAttr(o.label, T.outcomeW - 32, 7.3) }, P)}
  ${svgText(zx + 16, T.outcomeY + 60, o.zoneTitle, { size: 14.5, weight: 700, halo: o.fill, fit: P.fitAttr(o.zoneTitle, zw - 32, 8.0) }, P)}
  ${svgText(zx + 16, T.outcomeY + 78, o.zoneSub, { size: 12.5, halo: o.fill, fit: P.fitAttr(o.zoneSub, zw - 32, 6.9) }, P)}
  ${S(ox + T.outcomeW / 2, T.bar.y + T.bar.h + 19, o.step)}`;
    })
    .join('');

  const centers = T.outcomeXs.map((x) => x + T.outcomeW / 2); // 240, 600, 960
  return `${svgHeader(bp, bp.topUserTitle, bp.topUserSub, P)}
  <rect x="36" y="268" width="1128" height="1104" rx="14" ry="14" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/>

  <!-- Zone 1: 2-Question Topology Selector -->
  <rect x="${T.sel.x}" y="${T.sel.y}" width="${T.sel.w}" height="${T.sel.h}" rx="6" ry="6" fill="#aecbfa" stroke="${INK}" stroke-width="1"/>
  ${C({ x: T.inputs.x, y: T.inputs.y, w: T.inputs.w, h: T.inputs.h, iconKey: bp.inputs.icon, title: bp.inputs.title, sub: bp.inputs.sub })}
  <g>
    <rect x="${T.q1.x}" y="${T.q1.y}" width="${T.q1.w}" height="${T.q1.h}" rx="8" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <rect x="${T.q1.x + 12}" y="${T.q1.y + 12}" width="34" height="22" rx="11" ry="11" fill="${ROYAL}"/>
    ${svgText(T.q1.x + 29, T.q1.y + 28, 'Q1', { size: 12, weight: 700, fill: '#ffffff', anchor: 'middle' }, P)}
    ${svgText(T.q1.x + 54, T.q1.y + 29, bp.q1.title, { size: 13, weight: 700, fit: P.fitAttr(bp.q1.title, T.q1.w - 66, 7.3) }, P)}
    ${bp.q1.body.map((l, i) => svgText(T.q1.x + 12, T.q1.y + 52 + i * 16, l, { size: 11.5, fill: '#3c4043', fit: P.fitAttr(l, T.q1.w - 24, 6.2) }, P)).join('')}
  </g>
  <g>
    <rect x="${T.q2.x}" y="${T.q2.y}" width="${T.q2.w}" height="${T.q2.h}" rx="8" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="2"/>
    <rect x="${T.q2.x + 12}" y="${T.q2.y + 12}" width="34" height="22" rx="11" ry="11" fill="${ROYAL}"/>
    ${svgText(T.q2.x + 29, T.q2.y + 28, 'Q2', { size: 12, weight: 700, fill: '#ffffff', anchor: 'middle' }, P)}
    ${svgText(T.q2.x + 54, T.q2.y + 29, bp.q2.title, { size: 13, weight: 700, fit: P.fitAttr(bp.q2.title, T.q2.w - 66, 7.3) }, P)}
    ${bp.q2.body.map((l, i) => svgText(T.q2.x + 12, T.q2.y + 52 + i * 16, l, { size: 11.5, fill: '#3c4043', fit: P.fitAttr(l, T.q2.w - 24, 6.2) }, P)).join('')}
  </g>

  <!-- Zone 2: Agentic Triad (80% reusable core) -->
  <rect x="${T.gov.x}" y="${T.gov.y}" width="${T.gov.w}" height="${T.gov.h}" rx="6" ry="6" fill="#ceead6" stroke="${INK}" stroke-width="1"/>
  ${svgText(816, 372, bp.triadTitle, { size: 15, weight: 700 }, P)}
  ${svgText(816, 390, bp.triadTitle2, { size: 15, weight: 700 }, P)}
  ${C({ x: 824, y: 406, w: 276, h: 72, iconKey: triad[0].icon, title: triad[0].title, sub: triad[0].sub })}
  ${C({ x: 824, y: 492, w: 276, h: 72, iconKey: triad[1].icon, title: triad[1].title, sub: triad[1].sub })}
  ${C({ x: 824, y: 578, w: 276, h: 72, iconKey: triad[2].icon, title: triad[2].title, sub: triad[2].sub })}

  <!-- Core bar: every outcome inherits the triad -->
  <rect x="${T.bar.x}" y="${T.bar.y}" width="${T.bar.w}" height="${T.bar.h}" rx="6" ry="6" fill="#e6f4ea" stroke="#137333" stroke-width="1.6" stroke-dasharray="6,4"/>
  ${svgText(T.bar.x + T.bar.w / 2, T.bar.y + 20, bp.coreBar.title, { size: 12.5, weight: 700, fill: '#137333', anchor: 'middle', fit: P.fitAttr(bp.coreBar.title, T.bar.w - 40, 7.0) }, P)}

  <!-- Decision edges (zero crossings: B | A | C) -->
  ${svgArrow([[590, 138], [590, T.inputs.y - 2]])}
  ${S(562, 180, '1')}
  ${svgText(604, 185, bp.step1Label, { size: 14 }, P)}
  ${svgArrow([[240, T.inputs.y + T.inputs.h], [240, T.q1.y - 2]])}
  ${S(89, 524, '2')}
  ${svgArrow([[T.q1.x + T.q1.w, 524], [T.q2.x - 2, 524]])}
  ${svgText(398, 512, bp.q1No, { size: 12, weight: 700, anchor: 'middle' }, P)}
  ${S(710, 524, '3')}
  ${svgArrow([[240, T.q1.y + T.q1.h], [240, T.bar.y - 2]])}
  ${svgText(252, 610, bp.q1Yes[0], { size: 12, weight: 700 }, P)}
  ${svgText(252, 626, bp.q1Yes[1], { size: 11.5 }, P)}
  ${svgArrow([[496, T.q2.y + T.q2.h], [496, T.bar.y - 2]])}
  ${svgText(508, 610, bp.q2Single[0], { size: 12, weight: 700 }, P)}
  ${svgText(508, 626, bp.q2Single[1], { size: 11.5 }, P)}
  ${svgArrow([[672, T.q2.y + T.q2.h], [672, 708], [1000, 708], [1000, T.bar.y - 2]])}
  ${svgText(990, 686, bp.q2Multi[0], { size: 12, weight: 700, anchor: 'end' }, P)}
  ${svgText(990, 700, bp.q2Multi[1], { size: 11.5, anchor: 'end' }, P)}
  ${svgArrow([[1090, T.gov.y + T.gov.h], [1090, T.bar.y - 2]], { dashed: true })}
  ${centers.map((cxp) => svgArrow([[cxp, T.bar.y + T.bar.h], [cxp, T.outcomeY - 2]])).join('')}

  ${outcomesSvg}

  <!-- Foreground labels -->
  ${svgText(52, 291, bp.outerWrapperLabel, { weight: 700, halo: '#ffffff', fit: P.fitAttr(bp.outerWrapperLabel, 1090, 7.6) }, P)}
  ${svgText(84, 363, bp.selectorTitle, { size: 15, weight: 700, halo: '#aecbfa' }, P)}
  ${svgText(84, 381, bp.selectorSub, { size: 13, halo: '#aecbfa', fit: P.fitAttr(bp.selectorSub, 620, 7.0) }, P)}
</svg>`;
}

export function compileDecisionTreeDrawio(bp, P) {
  const B = createDrawioBuilder(P);
  const T = TREE;
  const triad = bp.triadCards;

  B.addCommonHeader(bp, bp.topUserTitle, bp.topUserSub);
  B.addWrapper('wrapper_shared_hubs', 36, 268, 1128, 1104, bp.outerWrapperLabel, 1090);
  B.addZone('zone_selector', T.sel.x, T.sel.y, T.sel.w, T.sel.h, '#aecbfa', bp.selectorTitle, bp.selectorSub);
  B.addVertex(
    'zone_triad_core',
    T.gov.x,
    T.gov.y,
    T.gov.w,
    T.gov.h,
    `${SVG_GUARD}<div style="font-family:${FONT};line-height:1.25;"><b style="font-size:14.5px;color:${INK};">${bp.triadTitle}<br/>${bp.triadTitle2}</b></div>`,
    'rounded=1;arcSize=2;whiteSpace=wrap;html=1;fillColor=#ceead6;strokeColor=#202124;strokeWidth=1;verticalAlign=top;align=left;spacingLeft=14;spacingTop=8;',
    true
  );

  B.addArchCard('card_inputs', T.inputs.x, T.inputs.y, T.inputs.w, T.inputs.h, bp.inputs);
  const qHtml = (tag, q) =>
    `${SVG_GUARD}<div style="font-family:${FONT};text-align:left;line-height:1.25;padding:4px 8px;"><b style="font-size:12.5px;color:${ROYAL};">${tag} · ${q.title}</b><br/><span style="font-size:11px;color:#3c4043;">${q.body.join(' ')}</span></div>`;
  B.addVertex('q1_compliance', T.q1.x, T.q1.y, T.q1.w, T.q1.h, qHtml('Q1', bp.q1), 'rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=left;verticalAlign=top;');
  B.addVertex('q2_tiers', T.q2.x, T.q2.y, T.q2.w, T.q2.h, qHtml('Q2', bp.q2), 'rounded=1;arcSize=8;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#202124;strokeWidth=2;align=left;verticalAlign=top;');

  B.addArchCard('card_triad_1', 824, 406, 276, 72, triad[0]);
  B.addArchCard('card_triad_2', 824, 492, 276, 72, triad[1]);
  B.addArchCard('card_triad_3', 824, 578, 276, 72, triad[2]);

  B.addVertex(
    'bar_triad_core',
    T.bar.x,
    T.bar.y,
    T.bar.w,
    T.bar.h,
    `${SVG_GUARD}<b style="font-family:${FONT};font-size:12.5px;color:#137333;">${bp.coreBar.title}</b>`,
    'rounded=1;arcSize=20;whiteSpace=wrap;html=1;fillColor=#e6f4ea;strokeColor=#137333;strokeWidth=1.6;dashed=1;dashPattern=6 4;align=center;verticalAlign=middle;'
  );

  const centers = T.outcomeXs.map((x) => x + T.outcomeW / 2);
  bp.outcomes.forEach((o, i) => {
    const ox = T.outcomeXs[i];
    const zx = ox + 16;
    const zw = T.outcomeW - 32;
    const cx = ox + 20;
    const k = o.key.toLowerCase();
    B.addWrapper(`outcome_${k}_wrapper`, ox, T.outcomeY, T.outcomeW, T.outcomeH, o.label, T.outcomeW - 32);
    B.addZone(`outcome_${k}_zone`, zx, T.outcomeY + 34, zw, T.outcomeH - 50, o.fill, o.zoneTitle, o.zoneSub);
    o.cards.forEach((c, j) => B.addArchCard(`card_${k}_${j + 1}`, cx, T.cardYs[j], T.cardW, T.cardH, c));
    B.addVertex(
      `verdict_${k}`,
      cx,
      T.verdictY,
      T.cardW,
      T.verdictH,
      `${SVG_GUARD}<div style="font-family:${FONT};text-align:center;line-height:1.3;"><b style="font-size:12.5px;color:${o.accent};">${o.verdict[0]}</b><br/><span style="font-size:11px;color:#3c4043;">${o.verdict[1]}</span></div>`,
      `rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=${o.accent};strokeWidth=2;align=center;verticalAlign=middle;`
    );
    [0, 1, 2].forEach((j) =>
      B.addPointEdge(`e_${k}_${j + 1}_${j + 2}`, [cx + 40, T.cardYs[j] + T.cardH], [cx + 40, T.cardYs[j + 1]], [], { source: `card_${k}_${j + 1}`, target: `card_${k}_${j + 2}` })
    );
    B.addStepBadge(`step_${o.step}_outcome_${k}`, centers[i], T.bar.y + T.bar.h + 19, o.step);
    B.addPointEdge(`e_bar_to_${k}`, [centers[i], T.bar.y + T.bar.h], [centers[i], T.outcomeY], [], { source: 'bar_triad_core', target: `outcome_${k}_wrapper` });
  });

  // Decision flow
  B.addStepBadge('step_1_top', 562, 180, '1');
  B.addCalloutText('lbl_step1_top', 602, 166, 128, 28, [bp.step1Label], 'left');
  B.addPointEdge('e_actor_to_inputs', [590, 138], [590, T.inputs.y], [], { source: 'actor_top_user', target: 'card_inputs' });
  B.addPointEdge('e_inputs_to_q1', [240, T.inputs.y + T.inputs.h], [240, T.q1.y], [], { source: 'card_inputs', target: 'q1_compliance' });
  B.addStepBadge('step_2_q1', 89, 524, '2');
  B.addStepBadge('step_3_q2', 710, 524, '3');
  B.addPointEdge('e_q1_no_q2', [T.q1.x + T.q1.w, 524], [T.q2.x, 524], [], { source: 'q1_compliance', target: 'q2_tiers' });
  B.addCalloutText('lbl_q1_no', 382, 496, 32, 22, [bp.q1No], 'center', 12, true);
  B.addPointEdge('e_q1_yes_b', [240, T.q1.y + T.q1.h], [240, T.bar.y], [], { source: 'q1_compliance', target: 'bar_triad_core' });
  B.addCalloutText('lbl_q1_yes', 250, 596, 150, 36, bp.q1Yes, 'left');
  B.addPointEdge('e_q2_single_a', [496, T.q2.y + T.q2.h], [496, T.bar.y], [], { source: 'q2_tiers', target: 'bar_triad_core' });
  B.addCalloutText('lbl_q2_single', 508, 596, 156, 36, bp.q2Single, 'left');
  B.addPointEdge('e_q2_multi_c', [672, T.q2.y + T.q2.h], [1000, T.bar.y], [[672, 708], [1000, 708]], { source: 'q2_tiers', target: 'bar_triad_core' });
  B.addCalloutText('lbl_q2_multi', 800, 674, 192, 30, bp.q2Multi, 'right');
  B.addPointEdge('e_triad_to_bar', [1090, T.gov.y + T.gov.h], [1090, T.bar.y], [], { dashed: true, source: 'zone_triad_core', target: 'bar_triad_core' });

  return B.finish(bp);
}

// =============================================================================================
// Rule 53G — Per-Pattern Geometry Contract (consumed by scripts/run_deep_forensic_audit.py F-11)
// =============================================================================================

export function layoutGeometryContract(layout) {
  if (layout === LAYOUT_POOLED_SHARED_PLANE) {
    return {
      layout,
      rule: 'Rule 53G • Pattern A: ONE shared runtime + ONE shared data plane; tenant partitions are chips INSIDE shared cards; 0 per-tenant wrappers',
      requiredVertexIds: ['wrapper_shared_plane', 'zone_pool_runtime', 'zone_pool_data', 'card_pool_run', 'card_pool_ma', 'card_pool_db', 'card_pool_mem', 'chip_db_0', 'chip_db_1', 'chip_mem_0', 'chip_mem_1'],
      forbiddenVertexIds: ['wrapper_left_pab', 'wrapper_right_pab', 'zone_left_tenant', 'zone_right_tenant'],
      singletonPrefixes: ['card_pool_run', 'card_pool_ma', 'card_pool_db', 'card_pool_mem'],
      containment: [
        { child: 'chip_db_0', parent: 'card_pool_db' },
        { child: 'chip_db_1', parent: 'card_pool_db' },
        { child: 'chip_mem_0', parent: 'card_pool_mem' },
        { child: 'chip_mem_1', parent: 'card_pool_mem' },
      ],
      requiredEdges: [['card_rc_cloudrun', 'card_pool_run'], ['card_pool_run', 'card_pool_db'], ['card_pool_sdp', 'card_rc_cloudrun']],
    };
  }
  if (layout === LAYOUT_DECISION_TREE_3_OUTCOME) {
    return {
      layout,
      rule: 'Rule 53G • Decision tree: 2 questions → 3 outcome spokes (B | A | C) through the Agentic Triad core bar; 0 request/response hub',
      requiredVertexIds: ['q1_compliance', 'q2_tiers', 'bar_triad_core', 'outcome_b_wrapper', 'outcome_a_wrapper', 'outcome_c_wrapper', 'card_triad_1', 'card_triad_2', 'card_triad_3'],
      forbiddenVertexIds: ['card_rc_alb', 'card_rc_cloudrun', 'wrapper_left_pab', 'wrapper_right_pab', 'step_7_top'],
      singletonPrefixes: ['q1_compliance', 'q2_tiers', 'bar_triad_core'],
      containment: [],
      requiredEdges: [['q1_compliance', 'q2_tiers'], ['q1_compliance', 'bar_triad_core'], ['q2_tiers', 'bar_triad_core'], ['bar_triad_core', 'outcome_b_wrapper'], ['bar_triad_core', 'outcome_a_wrapper'], ['bar_triad_core', 'outcome_c_wrapper']],
    };
  }
  return {
    layout: LAYOUT_HUB_2_SPOKE,
    rule: 'Rule 53G • Hub-and-spoke: shared routing + governance hubs and exactly 2 bounded spokes (Template #78 • 56 vertices / 23 edges)',
    requiredVertexIds: ['zone_routing_hub', 'zone_gov_hub', 'wrapper_left_pab', 'wrapper_right_pab', 'card_lc_run', 'card_sc_run', 'card_lc_db', 'card_sc_db'],
    forbiddenVertexIds: ['wrapper_shared_plane', 'q1_compliance'],
    singletonPrefixes: [],
    containment: [],
    requiredEdges: [['card_rc_alb', 'card_rc_cloudrun'], ['card_lc_run', 'card_sc_run']],
    exactCounts: { vertices: 56, edges: 23 },
  };
}
