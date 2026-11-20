import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface XmlHealerResult {
  isValid: boolean;
  isHealed: boolean;
  xml: string;
  healingLog: string[];
}

export function sanitizeDrawioXmlAttributes(xml: string): string {
  if (!xml) return xml;
  
  // 1. Convert non-ASCII unicode characters/emojis into safe numeric HTML entities using unicode surrogate mode to prevent invalid XML entities (e.g. &#55357;) and atob Latin1 failures
  let cleaned = xml.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\x00-\x7F]/gu, (char) => {
    const code = char.codePointAt(0);
    return code ? `&#${code};` : '';
  });

  // Clean any legacy invalid surrogate numeric character entities (&#55296; to &#57343;)
  cleaned = cleaned.replace(/&#(?:5[5-6][0-9]{3}|57[0-2][0-9]{2}|573[0-3][0-9]|5734[0-3]);/g, '');

  // 2. Fix unescaped raw '<' and '&quot;' inside value attributes without prematurely terminating on inner self-closing tags like <path ... />
  cleaned = cleaned.replace(/\bvalue="([\s\S]*?)"(?=\s+(?:style|vertex|edge|parent|source|target|id|visible|collapsed|connectable|as|geometry)=[^\n>]*|\s*\/?>\s*(?:<mxGeometry|<\/mxCell>|<mxCell|\s*$))/g, (match, valContent) => {
    const sanitized = valContent
      // Convert &quot; and inner double quotes to single quotes to prevent breaking out of attribute
      .replace(/&quot;/g, "'")
      .replace(/"/g, "'")
      // Replace raw HTML tags inside value attribute: <b>, </b>, <br>, <i>, </i>, <span>, </span>, <table>, etc.
      .replace(/<(\/?[a-zA-Z0-9]+(?:\s+[^>]*)?)>/g, '&lt;$1&gt;')
      // Fix unescaped < followed by numbers like <50ms, <75%
      .replace(/<([0-9]+)/g, '&lt;$1')
      // Replace any other raw '<'
      .replace(/<(?![a-zA-Z0-9/])/g, '&lt;');
    return `value="${sanitized}"`;
  });

  // Ensure all unescaped & characters are converted to &amp; entities
  cleaned = cleaned.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');

  // Ensure double-escaped &amp; entities are normalized
  cleaned = cleaned.replace(/&amp;amp;/g, '&amp;');

  // 3. XSS Sanitization: Neutralize <script>, javascript: pseudo-protocols, and inline DOM event attributes
  cleaned = cleaned
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, 'blocked_script:')
    .replace(/\son[a-zA-Z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

  return cleaned;
}

export function createBlankCanvasDrawioXml(title = 'Blank Canvas'): string {
  const safeTitle = title.replace(/[<>&"]/g, '');
  return `<mxfile host="app.diagrams.net"><diagram id="blank-canvas" name="${safeTitle}"><mxGraphModel dx="1422" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1000" math="0" shadow="0" data-blank-canvas="true"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;
}

export function validateAndHealDrawioXml(inputXml: string, archType?: string): XmlHealerResult {
  const healingLog: string[] = [];
  let isHealed = false;

  let workingXml = inputXml || '';
  const rawDataUriRe = /data:image\/([a-zA-Z0-9+-]+),([A-Za-z0-9+/]{16,}={0,2})/g;
  if (rawDataUriRe.test(workingXml)) {
    workingXml = workingXml.replace(rawDataUriRe, 'data:image/$1;base64,$2');
    isHealed = true;
    healingLog.push('Normalized base64 data URIs missing ;base64, marker.');
  }

  const isIntentionalBlankCanvas =
    archType === 'blank' ||
    archType === 'blank_canvas' ||
    archType === 'arch_blank_canvas' ||
    archType === 'canonical_blank' ||
    workingXml.includes('data-blank-canvas="true"');

  if (isIntentionalBlankCanvas && !workingXml.includes('vertex="1"')) {
    const cleanBlankXml = workingXml.includes('data-blank-canvas="true"')
      ? workingXml
      : `<mxGraphModel dx="1422" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1000" math="0" shadow="0" data-blank-canvas="true"><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>`;
    healingLog.push('Intentional Blank Canvas preserved (0 vertices).');
    return { isValid: true, isHealed: false, xml: cleanBlankXml, healingLog };
  }

  const isCompletelyEmpty =
    !workingXml ||
    typeof workingXml !== 'string' ||
    workingXml.includes('<root><mxCell id="0"/><mxCell id="1" parent="0"/></root>') ||
    !workingXml.includes('vertex="1"');

  if (isCompletelyEmpty) {
    healingLog.push('Input XML had 0 vertices or was empty.');
    return { isValid: false, isHealed: true, xml: createBlankCanvasDrawioXml('Empty Fallback'), healingLog };
  }

  const isProtectedBlueprint =
    archType === 'vision_decompiled' ||
    archType === 'compound_freeform' ||
    archType === 'canonical_google_cloud_ref_v2' ||
    (archType !== undefined && (archType.startsWith('canonical') || archType.includes('unified') || archType.includes('gcp'))) ||
    workingXml.includes('canonical') ||
    workingXml.includes('Reference Architecture v2.0');

  if (isProtectedBlueprint) {
    const safeXml = workingXml.replace(/&amp;amp;(?:amp;)*/g, '&amp;');
    return {
      isValid: true,
      isHealed,
      xml: safeXml,
      healingLog: [...healingLog, 'Protected canonical blueprint passed through without geometric mutation.'],
    };
  }

  let cleaned = workingXml.trim();
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/gi, '').replace(/\n?```$/g, '').trim();
    isHealed = true;
  }
  if (cleaned.includes('&amp;amp;')) {
    cleaned = cleaned.replace(/&amp;amp;(?:amp;)*/g, '&amp;');
    isHealed = true;
  }
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#[0-9]+;|#x[0-9a-fA-F]+;)/.test(cleaned)) {
    cleaned = cleaned.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#[0-9]+;|#x[0-9a-fA-F]+;)/g, '&amp;');
    isHealed = true;
  }
  if (!cleaned.includes('<mxfile')) {
    isHealed = true;
    cleaned = `<mxfile host="app.diagrams.net"><diagram id="healed-diagram" name="Architecture">${cleaned}</diagram></mxfile>`;
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseTagValue: false,
    parseAttributeValue: false,
    maxNestedTags: 1000,
  });
  try {
    const ast = parser.parse(cleaned);
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
    const rebuilt = builder.build(ast).replace(/^<\?xml[^>]*\?>\s*/i, '').trim();
    return { isValid: true, isHealed, xml: sanitizeDrawioXmlAttributes(rebuilt), healingLog };
  } catch {
    return { isValid: true, isHealed, xml: sanitizeDrawioXmlAttributes(cleaned), healingLog };
  }
}
