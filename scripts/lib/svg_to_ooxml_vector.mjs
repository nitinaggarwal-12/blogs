/**
 * Deterministic SVG-to-Native-DrawingML (<a:custGeom>) Vector Icon Compiler.
 *
 * Converts every official GCP/Agentic SVG icon from `gcp_official_svg_icons.mjs`
 * into pure top-level OOXML `<p:sp>` vector shapes (`pic=0`, zero `<p:pic>`,
 * zero `<p:grpSp>`, zero `<a:arcTo>`, zero `<a:schemeClr>`, zero `h="0"`).
 *
 * Emitting all primitives (`path`, `polygon`, `rect`, `circle`, `ellipse`) as
 * `<a:custGeom>` paths preserves exact SVG paint z-order across Google Slides,
 * PowerPoint, LibreOffice, and `render_pptx_preview.py`, so slide icons match
 * the web SVG and Draw.io icons 1:1.
 */

import { GCP_VECTOR_ICONS } from './gcp_official_svg_icons.mjs';

const EMU_PER_PX = 7620;
const MIN_CUSTGEOM_EMU = 91440;
const KAPPA = 0.5522847498;

function hex6(c) {
  const s = String(c || '').trim().replace(/^#/, '');
  if (s.length === 3) return (s[0] + s[0] + s[1] + s[1] + s[2] + s[2]).toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
  return null;
}

/**
 * W3C SVG 1.1 Implementation Notes F.6.5 / F.6.6: convert elliptical arc to
 * cubic Bezier segments so DrawingML never needs `<a:arcTo>`.
 */
function arcToCubicBeziers(x1, y1, rxIn, ryIn, phiDeg, largeArcFlag, sweepFlag, x2, y2) {
  if (Math.hypot(x2 - x1, y2 - y1) < 1e-9) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx < 1e-9 || ry < 1e-9) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx2 = (x1 - x2) / 2;
  const dy2 = (y1 - y2) / 2;
  const x1p = cosPhi * dx2 + sinPhi * dy2;
  const y1p = -sinPhi * dx2 + cosPhi * dy2;
  let rx2 = rx * rx;
  let ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;
  const lam = x1p2 / rx2 + y1p2 / ry2;
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
    rx2 = rx * rx;
    ry2 = ry * ry;
  }
  const sign = largeArcFlag === sweepFlag ? -1 : 1;
  const num = Math.max(0, rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2);
  const den = rx2 * y1p2 + ry2 * x1p2;
  const coef = den < 1e-12 ? 0 : sign * Math.sqrt(num / den);
  const cxp = coef * ((rx * y1p) / ry);
  const cyp = coef * (-(ry * x1p) / rx);
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const vecAngle = (ux, uy, vx, vy) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const cosA = Math.max(-1, Math.min(1, len ? dot / len : 1));
    const ang = Math.acos(cosA);
    return ux * vy - uy * vx < 0 ? -ang : ang;
  };
  const theta1 = vecAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dTheta = vecAngle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweepFlag && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweepFlag && dTheta < 0) dTheta += 2 * Math.PI;

  const segs = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segs;
  const alpha = (4 / 3) * Math.tan(delta / 4);
  const out = [];
  for (let i = 0; i < segs; i++) {
    const t1 = theta1 + i * delta;
    const t2 = t1 + delta;
    const c1 = Math.cos(t1);
    const s1 = Math.sin(t1);
    const c2 = Math.cos(t2);
    const s2 = Math.sin(t2);
    const pts = [
      [c1 - alpha * s1, s1 + alpha * c1],
      [c2 + alpha * s2, s2 - alpha * c2],
      [c2, s2],
    ].map(([px, py]) => [
      cosPhi * rx * px - sinPhi * ry * py + cx,
      sinPhi * rx * px + cosPhi * ry * py + cy,
    ]);
    out.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1]]);
  }
  return out;
}

function parseSvgPathData(d) {
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|([+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?)/g;
  let m;
  while ((m = re.exec(d))) {
    if (m[1]) tokens.push({ type: 'cmd', v: m[1] });
    else tokens.push({ type: 'num', v: parseFloat(m[2]) });
  }
  const cmds = [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let prevC2x = 0;
  let prevC2y = 0;
  let prevCmd = '';
  let curCmd = '';
  const readNum = () => (i < tokens.length && tokens[i].type === 'num' ? tokens[i++].v : 0);

  while (i < tokens.length) {
    if (tokens[i].type === 'cmd') curCmd = tokens[i++].v;
    else if (curCmd === 'M') curCmd = 'L';
    else if (curCmd === 'm') curCmd = 'l';

    if (curCmd === 'Z' || curCmd === 'z') {
      cmds.push({ op: 'Z' });
      cx = sx;
      cy = sy;
      prevCmd = curCmd;
      curCmd = '';
      continue;
    }
    if (curCmd === 'M' || curCmd === 'm') {
      const x = readNum();
      const y = readNum();
      cx = curCmd === 'm' ? cx + x : x;
      cy = curCmd === 'm' ? cy + y : y;
      sx = cx;
      sy = cy;
      cmds.push({ op: 'M', x: cx, y: cy });
      prevCmd = curCmd;
      continue;
    }
    if (curCmd === 'L' || curCmd === 'l') {
      const x = readNum();
      const y = readNum();
      cx = curCmd === 'l' ? cx + x : x;
      cy = curCmd === 'l' ? cy + y : y;
      cmds.push({ op: 'L', x: cx, y: cy });
      prevCmd = curCmd;
      continue;
    }
    if (curCmd === 'H' || curCmd === 'h') {
      const x = readNum();
      cx = curCmd === 'h' ? cx + x : x;
      cmds.push({ op: 'L', x: cx, y: cy });
      prevCmd = curCmd;
      continue;
    }
    if (curCmd === 'V' || curCmd === 'v') {
      const y = readNum();
      cy = curCmd === 'v' ? cy + y : y;
      cmds.push({ op: 'L', x: cx, y: cy });
      prevCmd = curCmd;
      continue;
    }
    if (curCmd === 'C' || curCmd === 'c') {
      const x1 = readNum();
      const y1 = readNum();
      const x2 = readNum();
      const y2 = readNum();
      const x = readNum();
      const y = readNum();
      const rel = curCmd === 'c';
      const ax1 = rel ? cx + x1 : x1;
      const ay1 = rel ? cy + y1 : y1;
      const ax2 = rel ? cx + x2 : x2;
      const ay2 = rel ? cy + y2 : y2;
      const ax = rel ? cx + x : x;
      const ay = rel ? cy + y : y;
      cmds.push({ op: 'C', x1: ax1, y1: ay1, x2: ax2, y2: ay2, x: ax, y: ay });
      prevC2x = ax2;
      prevC2y = ay2;
      cx = ax;
      cy = ay;
      prevCmd = curCmd;
      continue;
    }
    if (curCmd === 'S' || curCmd === 's') {
      const x2 = readNum();
      const y2 = readNum();
      const x = readNum();
      const y = readNum();
      const rel = curCmd === 's';
      const hasPrevC = prevCmd === 'C' || prevCmd === 'c' || prevCmd === 'S' || prevCmd === 's';
      const ax1 = hasPrevC ? 2 * cx - prevC2x : cx;
      const ay1 = hasPrevC ? 2 * cy - prevC2y : cy;
      const ax2 = rel ? cx + x2 : x2;
      const ay2 = rel ? cy + y2 : y2;
      const ax = rel ? cx + x : x;
      const ay = rel ? cy + y : y;
      cmds.push({ op: 'C', x1: ax1, y1: ay1, x2: ax2, y2: ay2, x: ax, y: ay });
      prevC2x = ax2;
      prevC2y = ay2;
      cx = ax;
      cy = ay;
      prevCmd = curCmd;
      continue;
    }
    if (curCmd === 'A' || curCmd === 'a') {
      const rx = readNum();
      const ry = readNum();
      const rot = readNum();
      const laf = readNum();
      const sf = readNum();
      const x = readNum();
      const y = readNum();
      const rel = curCmd === 'a';
      const ax = rel ? cx + x : x;
      const ay = rel ? cy + y : y;
      for (const seg of arcToCubicBeziers(cx, cy, rx, ry, rot, laf ? 1 : 0, sf ? 1 : 0, ax, ay)) {
        cmds.push({ op: 'C', x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3], x: seg[4], y: seg[5] });
      }
      cx = ax;
      cy = ay;
      prevCmd = curCmd;
      continue;
    }
    i++;
  }
  return cmds;
}

function ellipseCmds(cx, cy, rx, ry) {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { op: 'M', x: cx, y: cy - ry },
    { op: 'C', x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
    { op: 'C', x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
    { op: 'C', x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
    { op: 'C', x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
    { op: 'Z' },
  ];
}

function roundRectCmds(x, y, w, h, rIn) {
  const r = Math.max(0, Math.min(rIn || 0, w / 2, h / 2));
  if (r < 1e-6) {
    return [
      { op: 'M', x, y },
      { op: 'L', x: x + w, y },
      { op: 'L', x: x + w, y: y + h },
      { op: 'L', x, y: y + h },
      { op: 'Z' },
    ];
  }
  const k = r * KAPPA;
  return [
    { op: 'M', x: x + r, y },
    { op: 'L', x: x + w - r, y },
    { op: 'C', x1: x + w - r + k, y1: y, x2: x + w, y2: y + r - k, x: x + w, y: y + r },
    { op: 'L', x: x + w, y: y + h - r },
    { op: 'C', x1: x + w, y1: y + h - r + k, x2: x + w - r + k, y2: y + h, x: x + w - r, y: y + h },
    { op: 'L', x: x + r, y: y + h },
    { op: 'C', x1: x + r - k, y1: y + h, x2: x, y2: y + h - r + k, x: x, y: y + h - r },
    { op: 'L', x, y: y + r },
    { op: 'C', x1: x, y1: y + r - k, x2: x + r - k, y2: y, x: x + r, y },
    { op: 'Z' },
  ];
}

function parseAttrs(s) {
  const out = {};
  for (const m of s.matchAll(/([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

/**
 * Compiles any icon key from `GCP_VECTOR_ICONS` into top-level native DrawingML
 * `<p:sp>` vector shapes positioned at `(pxX, pxY)` with width=height=`pxSize`
 * in 1600x900 canvas coordinates (7620 EMU/px).
 */
export function compileIconToOoxmlShapes(iconKey, pxX, pxY, pxSize, nextId) {
  const rec = GCP_VECTOR_ICONS[iconKey] || GCP_VECTOR_ICONS.gcp_cloud;
  const vb = rec.viewBox.split(/\s+/).map(Number);
  const vbW = vb[2] || 24;
  const vbH = vb[3] || 24;
  const scaleEmu = (pxSize * EMU_PER_PX) / vbW;
  const baseOffX = Math.round(pxX * EMU_PER_PX);
  const baseOffY = Math.round(pxY * EMU_PER_PX);

  const primitives = [];
  const stack = [{ tx: 0, ty: 0 }];
  const tagRe = /<\/g>|<g\b([^>]*)>|<(path|rect|circle|ellipse|polygon)\b([^>]*?)\/>/g;
  let m;
  while ((m = tagRe.exec(rec.inner))) {
    if (m[0] === '</g>') {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (m[0].startsWith('<g')) {
      const cur = stack[stack.length - 1];
      let tx = cur.tx;
      let ty = cur.ty;
      const tm = /translate\(\s*([+-]?[\d.]+)(?:[\s,]+([+-]?[\d.]+))?\s*\)/.exec(m[1] || '');
      if (tm) {
        tx += parseFloat(tm[1] || '0');
        ty += parseFloat(tm[2] || '0');
      }
      stack.push({ tx, ty });
      continue;
    }
    primitives.push({
      tag: m[2],
      attrs: parseAttrs(m[3] || ''),
      tx: stack[stack.length - 1].tx,
      ty: stack[stack.length - 1].ty,
    });
  }

  const shapes = [];
  for (const p of primitives) {
    const fHex = p.attrs.fill === 'none' ? null : hex6(p.attrs.fill);
    const sHex = p.attrs.stroke && p.attrs.stroke !== 'none' ? hex6(p.attrs.stroke) : null;
    if (!fHex && !sHex) continue;

    const fillXml = fHex ? `<a:solidFill><a:srgbClr val="${fHex}"/></a:solidFill>` : `<a:noFill/>`;
    let lnXml = `<a:ln><a:noFill/></a:ln>`;
    if (sHex) {
      const swPx = parseFloat(p.attrs['stroke-width'] || '1.5') * (pxSize / vbW);
      const swEmu = Math.max(6350, Math.round(swPx * EMU_PER_PX));
      const cap = p.attrs['stroke-linecap'] === 'round' ? ' cap="rnd"' : '';
      const dash = p.attrs['stroke-dasharray'] ? '<a:prstDash val="sysDash"/>' : '';
      const join = p.attrs['stroke-linejoin'] === 'round' ? '<a:round/>' : '';
      lnXml = `<a:ln w="${swEmu}"${cap}><a:solidFill><a:srgbClr val="${sHex}"/></a:solidFill>${dash}${join}</a:ln>`;
    }

    let cmds = [];
    if (p.tag === 'rect') {
      const x = parseFloat(p.attrs.x || '0');
      const y = parseFloat(p.attrs.y || '0');
      const w = parseFloat(p.attrs.width || '0');
      const h = parseFloat(p.attrs.height || '0');
      if (w <= 0 || h <= 0) continue;
      cmds = roundRectCmds(x, y, w, h, parseFloat(p.attrs.rx || '0'));
    } else if (p.tag === 'circle') {
      const r = parseFloat(p.attrs.r || '0');
      if (r <= 0) continue;
      cmds = ellipseCmds(parseFloat(p.attrs.cx || '0'), parseFloat(p.attrs.cy || '0'), r, r);
    } else if (p.tag === 'ellipse') {
      const rx = parseFloat(p.attrs.rx || '0');
      const ry = parseFloat(p.attrs.ry || '0');
      if (rx <= 0 || ry <= 0) continue;
      cmds = ellipseCmds(parseFloat(p.attrs.cx || '0'), parseFloat(p.attrs.cy || '0'), rx, ry);
    } else if (p.tag === 'polygon') {
      const nums = (p.attrs.points || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
      for (let k = 0; k + 1 < nums.length; k += 2) {
        cmds.push({ op: k === 0 ? 'M' : 'L', x: nums[k], y: nums[k + 1] });
      }
      if (cmds.length >= 2) cmds.push({ op: 'Z' });
    } else if (p.tag === 'path') {
      cmds = parseSvgPathData(p.attrs.d || '');
    }
    if (!cmds.length) continue;

    const tCmds = [];
    let minX = 0;
    let minY = 0;
    let maxX = Math.round(vbW * scaleEmu);
    let maxY = Math.round(vbH * scaleEmu);
    const track = (x, y) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    for (const c of cmds) {
      if (c.op === 'Z') {
        tCmds.push(c);
        continue;
      }
      if (c.op === 'M' || c.op === 'L') {
        const x = Math.round((c.x + p.tx) * scaleEmu);
        const y = Math.round((c.y + p.ty) * scaleEmu);
        track(x, y);
        tCmds.push({ op: c.op, x, y });
      } else if (c.op === 'C') {
        const x1 = Math.round((c.x1 + p.tx) * scaleEmu);
        const y1 = Math.round((c.y1 + p.ty) * scaleEmu);
        const x2 = Math.round((c.x2 + p.tx) * scaleEmu);
        const y2 = Math.round((c.y2 + p.ty) * scaleEmu);
        const x = Math.round((c.x + p.tx) * scaleEmu);
        const y = Math.round((c.y + p.ty) * scaleEmu);
        track(x1, y1);
        track(x2, y2);
        track(x, y);
        tCmds.push({ op: 'C', x1, y1, x2, y2, x, y });
      }
    }
    const boxW = Math.max(MIN_CUSTGEOM_EMU, maxX - minX);
    const boxH = Math.max(MIN_CUSTGEOM_EMU, maxY - minY);
    const pathBody = tCmds
      .map((c) => {
        if (c.op === 'Z') return '<a:close/>';
        if (c.op === 'M') return `<a:moveTo><a:pt x="${c.x - minX}" y="${c.y - minY}"/></a:moveTo>`;
        if (c.op === 'L') return `<a:lnTo><a:pt x="${c.x - minX}" y="${c.y - minY}"/></a:lnTo>`;
        return `<a:cubicBezTo><a:pt x="${c.x1 - minX}" y="${c.y1 - minY}"/><a:pt x="${c.x2 - minX}" y="${c.y2 - minY}"/><a:pt x="${c.x - minX}" y="${c.y - minY}"/></a:cubicBezTo>`;
      })
      .join('');
    const pAttrs = `w="${boxW}" h="${boxH}"${fHex ? '' : ' fill="none"'}${sHex ? '' : ' stroke="0"'} extrusionOk="0"`;
    shapes.push(
      `<p:sp><p:nvSpPr><p:cNvPr id="${nextId()}" name="ico_${iconKey}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
        `<p:spPr><a:xfrm><a:off x="${baseOffX + minX}" y="${baseOffY + minY}"/><a:ext cx="${boxW}" cy="${boxH}"/></a:xfrm>` +
        `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/>` +
        `<a:pathLst><a:path ${pAttrs}>${pathBody}</a:path></a:pathLst></a:custGeom>` +
        `${fillXml}${lnXml}</p:spPr></p:sp>`
    );
  }
  return shapes;
}
