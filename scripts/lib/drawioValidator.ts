import { XMLParser } from 'fast-xml-parser';

export type ErrorCode =
  | 'XML_INVALID'
  | 'EDGE_DANGLING'
  | 'GEOMETRY_MISSING'
  | 'OVERLAP'
  | 'OUT_OF_CONTAINER'
  | 'OUT_OF_BOUNDS'
  | 'ORPHAN_NODE'
  | 'DATA_STORE_DISCONNECTED'
  | 'FLOW_BACKTRACKING_DETECTED'
  | 'CLOSED_LOOP_MISSING_EDGE'
  | 'NON_ORTHOGONAL_EDGE_SEGMENT'
  | 'CONTAINER_HEADER_SLICED'
  | 'EDGE_INTERSECTS_VERTEX'
  | 'TEXT_OVERFLOW_HEIGHT'
  | 'DEAD_RIGHT_MARGIN'
  | 'EDGE_LABEL_MISSING_PILL'
  | 'DECISION_GATE_INCOMPLETE'
  | 'CDN_CACHE_INVERTED_ROUTING'
  | 'UNCONNECTED_LOAD_BALANCER'
  | 'RELATIONAL_REPLICATION_PIPELINE';

export interface ValidationError {
  code: ErrorCode;
  cells: string[];
  detail: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

interface ParsedVertex {
  id: string;
  parent: string;
  isContainer: boolean;
  isLabelOrHeader: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  absX: number;
  absY: number;
  label?: string;
  style?: string;
}

interface ParsedEdge {
  id: string;
  source: string;
  target: string;
  hasSourcePoint?: boolean;
  hasTargetPoint?: boolean;
  label?: string;
  style?: string;
  points?: { x: number; y: number }[];
  exitX?: number;
  exitY?: number;
  entryX?: number;
  entryY?: number;
}

export function validateDrawioXml(xmlString: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!xmlString || typeof xmlString !== 'string' || xmlString.trim().length === 0) {
    return {
      valid: false,
      errors: [{ code: 'XML_INVALID', cells: [], detail: 'XML input is empty' }],
      warnings: [],
    };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  let parsed: any;
  try {
    parsed = parser.parse(xmlString);
  } catch (err: any) {
    return {
      valid: false,
      errors: [{ code: 'XML_INVALID', cells: [], detail: `XML Parse Failure: ${err?.message}` }],
      warnings: [],
    };
  }

  const mxfile = parsed?.mxfile;
  let diagrams = mxfile?.diagram;
  if (diagrams && !Array.isArray(diagrams)) {
    diagrams = [diagrams];
  }
  const firstDiagram = Array.isArray(diagrams) && diagrams.length > 0 ? diagrams[0] : (diagrams || mxfile);
  const graphModel = firstDiagram?.mxGraphModel || parsed?.mxGraphModel || parsed?.root?.mxGraphModel;
  const root = graphModel?.root || parsed?.root;

  if (!root) {
    return {
      valid: false,
      errors: [{ code: 'XML_INVALID', cells: [], detail: 'Missing mxGraphModel or root element' }],
      warnings: [],
    };
  }

  let rawCells = root.mxCell;
  if (!rawCells) {
    return {
      valid: false,
      errors: [{ code: 'XML_INVALID', cells: [], detail: 'Missing mxCell elements inside root' }],
      warnings: [],
    };
  }

  if (!Array.isArray(rawCells)) {
    rawCells = [rawCells];
  }

  const parentIds = new Set<string>();
  for (const cell of rawCells) {
    const p = cell['@_parent'];
    if (p && p !== '0' && p !== '1') {
      parentIds.add(p);
    }
  }

  const cellIdSet = new Set<string>();
  const duplicateIds: string[] = [];

  let hasCell0 = false;
  let hasCell1 = false;

  const verticesMap = new Map<string, ParsedVertex>();
  const edgesMap = new Map<string, ParsedEdge>();

  for (const cell of rawCells) {
    const id = cell['@_id'];
    if (!id) {
      errors.push({ code: 'XML_INVALID', cells: [], detail: 'Cell missing id attribute' });
      continue;
    }

    if (id === '0') hasCell0 = true;
    if (id === '1') hasCell1 = true;

    if (cellIdSet.has(id)) {
      duplicateIds.push(id);
    }
    cellIdSet.add(id);

    const isVertex = cell['@_vertex'] === '1' || cell['@_vertex'] === 1;
    const isEdge = cell['@_edge'] === '1' || cell['@_edge'] === 1;

    if (isVertex) {
      const parent = cell['@_parent'] || '1';
      const style = cell['@_style'] || '';
      const isContainer = style.includes('container=1') ||
                          style.includes('swimlane') ||
                          style.includes('group') ||
                          parentIds.has(id) ||
                          ((id.startsWith('container_') ||
                            id.startsWith('swimlane_') ||
                            id.startsWith('grp_') ||
                            id.startsWith('group_') ||
                            id.startsWith('tier_') ||
                            id.startsWith('zone_') ||
                            id.startsWith('vpc_') ||
                            id.startsWith('subnet_') ||
                            id.startsWith('boundary_') ||
                            id.startsWith('cluster_') ||
                            id.startsWith('network_') ||
                            id.startsWith('env_') ||
                            id.includes('container') ||
                            id.includes('cluster') ||
                            id.includes('frame') ||
                            id.includes('panel')) && !id.endsWith('_box') && !id.endsWith('_pill'));

      const isLabelOrHeader = id.startsWith('lbl_') ||
                              id.endsWith('_lbl') ||
                              id.includes('_lbl_') ||
                              id.startsWith('title_') ||
                              id.endsWith('_title') ||
                              id.startsWith('banner_') ||
                              id.includes('banner') ||
                              id.includes('boundary') ||
                              id.startsWith('legend_') ||
                              id.startsWith('leg_') ||
                              id.startsWith('enabler_') ||
                              id.startsWith('tech_') ||
                              id.startsWith('meta_') ||
                              id.startsWith('footer_') ||
                              id.startsWith('ftr_') ||
                              id.startsWith('watermark_') ||
                              id.startsWith('callout_') ||
                              id.startsWith('why_') ||
                              id.startsWith('desc_') ||
                              id.startsWith('bar_') ||
                              id.startsWith('stage_') ||
                              id.includes('badge') ||
                              id.includes('pill') ||
                              id.includes('tag') ||
                              id.includes('icon') ||
                              id.includes('label') ||
                              id.includes('tab') ||
                              id.includes('hdr') ||
                              style.includes('shape=text') ||
                              style.includes('text;') ||
                              (style.includes('fillColor=none') && style.includes('strokeColor=none'));

      const geom = cell.mxGeometry;
      if (!geom) {
        errors.push({
          code: 'GEOMETRY_MISSING',
          cells: [id],
          detail: `Vertex "${id}" is missing mxGeometry`,
        });
        continue;
      }

      const x = parseFloat(geom['@_x'] || '0');
      const y = parseFloat(geom['@_y'] || '0');
      const width = parseFloat(geom['@_width'] || '0');
      const height = parseFloat(geom['@_height'] || '0');

      if (width <= 0 || height <= 0) {
        errors.push({
          code: 'GEOMETRY_MISSING',
          cells: [id],
          detail: `Vertex "${id}" has invalid zero or negative dimensions (${width}x${height})`,
        });
      }

      if ((parent === '1' || parent === '0') && (x < 0 || y < 0)) {
        errors.push({
          code: 'OUT_OF_BOUNDS',
          cells: [id],
          detail: `Top-level vertex "${id}" has negative relative coordinates (${x}, ${y})`,
        });
      }

      verticesMap.set(id, {
        id,
        parent,
        isContainer,
        isLabelOrHeader,
        x,
        y,
        width,
        height,
        absX: x,
        absY: y,
        label: cell['@_value'] || '',
        style,
      });
    } else if (isEdge) {
      const source = cell['@_source'];
      const target = cell['@_target'];
      const style = cell['@_style'] || '';
      const geom = cell.mxGeometry;
      const directPoints = geom?.mxPoint ? (Array.isArray(geom.mxPoint) ? geom.mxPoint : [geom.mxPoint]) : [];
      const arrayPoints = geom?.Array?.mxPoint ? (Array.isArray(geom.Array.mxPoint) ? geom.Array.mxPoint : [geom.Array.mxPoint]) : [];
      const points = [...directPoints, ...arrayPoints];
      const hasSourcePoint = points.some((pt: any) => pt?.['@_as'] === 'sourcePoint');
      const hasTargetPoint = points.some((pt: any) => pt?.['@_as'] === 'targetPoint');
      const waypoints = points
        .filter((pt: any) => !pt?.['@_as'])
        .map((pt: any) => ({ x: parseFloat(pt['@_x'] || '0'), y: parseFloat(pt['@_y'] || '0') }));

      const exitXMatch = style.match(/exitX=([0-9.]+)/);
      const exitYMatch = style.match(/exitY=([0-9.]+)/);
      const entryXMatch = style.match(/entryX=([0-9.]+)/);
      const entryYMatch = style.match(/entryY=([0-9.]+)/);

      edgesMap.set(id, {
        id,
        source,
        target,
        hasSourcePoint,
        hasTargetPoint,
        label: cell['@_value'] || '',
        style,
        points: waypoints,
        exitX: exitXMatch ? parseFloat(exitXMatch[1]) : undefined,
        exitY: exitYMatch ? parseFloat(exitYMatch[1]) : undefined,
        entryX: entryXMatch ? parseFloat(entryXMatch[1]) : undefined,
        entryY: entryYMatch ? parseFloat(entryYMatch[1]) : undefined,
      });
    }
  }

  if (!hasCell0 || !hasCell1) {
    errors.push({
      code: 'XML_INVALID',
      cells: [],
      detail: 'Missing required root cells "0" or "1"',
    });
  }

  if (duplicateIds.length > 0) {
    errors.push({
      code: 'XML_INVALID',
      cells: duplicateIds,
      detail: `Duplicate cell IDs found: ${duplicateIds.join(', ')}`,
    });
  }

  // Compute recursive absolute coordinates on canvas across arbitrary nesting depths
  const absComputed = new Set<string>();
  function resolveAbsoluteCoords(v: ParsedVertex, visiting = new Set<string>()): { absX: number; absY: number } {
    if (absComputed.has(v.id)) {
      return { absX: v.absX, absY: v.absY };
    }
    if (visiting.has(v.id)) {
      // Cycle protection
      return { absX: v.x, absY: v.y };
    }
    visiting.add(v.id);

    if (v.parent && v.parent !== '0' && v.parent !== '1' && verticesMap.has(v.parent)) {
      const parentV = verticesMap.get(v.parent)!;
      const pCoords = resolveAbsoluteCoords(parentV, visiting);
      v.absX = pCoords.absX + v.x;
      v.absY = pCoords.absY + v.y;
    } else {
      v.absX = v.x;
      v.absY = v.y;
    }

    absComputed.add(v.id);
    return { absX: v.absX, absY: v.absY };
  }

  for (const v of verticesMap.values()) {
    resolveAbsoluteCoords(v);
  }

  // Check EDGE_DANGLING & collect connected nodes
  const connectedNodeIds = new Set<string>();
  for (const [edgeId, edge] of edgesMap.entries()) {
    if (!edge.source || !verticesMap.has(edge.source)) {
      if (!edge.hasSourcePoint) {
        errors.push({
          code: 'EDGE_DANGLING',
          cells: [edgeId],
          detail: `Edge "${edgeId}" source "${edge.source}" is not a valid vertex and has no explicit sourcePoint`,
        });
      }
    } else {
      connectedNodeIds.add(edge.source);
    }

    if (!edge.target || !verticesMap.has(edge.target)) {
      if (!edge.hasTargetPoint) {
        errors.push({
          code: 'EDGE_DANGLING',
          cells: [edgeId],
          detail: `Edge "${edgeId}" target "${edge.target}" is not a valid vertex and has no explicit targetPoint`,
        });
      }
    } else {
      connectedNodeIds.add(edge.target);
    }
  }

  // Check OUT_OF_BOUNDS
  for (const [id, v] of verticesMap.entries()) {
    if (v.absX < 0 || v.absY < 0 || v.absX + v.width > 8000 || v.absY + v.height > 8000) {
      errors.push({
        code: 'OUT_OF_BOUNDS',
        cells: [id],
        detail: `Vertex "${id}" extends beyond 0..8000 canvas bounds (extent: [${v.absX}, ${v.absY}] -> [${v.absX + v.width}, ${v.absY + v.height}])`,
      });
    }
  }

  // Check OUT_OF_CONTAINER
  for (const [id, v] of verticesMap.entries()) {
    if (!v.isContainer && v.parent !== '1' && verticesMap.has(v.parent)) {
      const parentV = verticesMap.get(v.parent)!;
      if (!v.isLabelOrHeader && v.y < 30) {
        errors.push({
          code: 'OUT_OF_CONTAINER',
          cells: [id, parentV.id],
          detail: `Child vertex "${id}" (y=${v.y}) overlaps container top-label band (top 30px) of parent "${parentV.id}"`,
        });
      }
      if (v.x + v.width > parentV.width + 10) {
        errors.push({
          code: 'OUT_OF_CONTAINER',
          cells: [id, parentV.id],
          detail: `Child vertex "${id}" right edge (${v.x + v.width}px) exceeds parent "${parentV.id}" width (${parentV.width}px)`,
        });
      }
      if (v.y + v.height > parentV.height + 10) {
        errors.push({
          code: 'OUT_OF_CONTAINER',
          cells: [id, parentV.id],
          detail: `Child vertex "${id}" bottom edge (${v.y + v.height}px) exceeds parent "${parentV.id}" height (${parentV.height}px)`,
        });
      }
    }
  }

  // Check OVERLAP between sibling non-container, non-label vertices
  const verticesList = Array.from(verticesMap.values()).filter((v) => !v.isContainer && !v.isLabelOrHeader);
  for (let i = 0; i < verticesList.length; i++) {
    for (let j = i + 1; j < verticesList.length; j++) {
      const v1 = verticesList[i];
      const v2 = verticesList[j];

      if (v1.parent === v2.parent) {
        if (v1.width * v1.height >= v2.width * v2.height * 2.2 || v2.width * v2.height >= v1.width * v1.height * 2.2) {
          continue;
        }

        const v1EnclosesV2 = (v1.width > v2.width + 10 && v1.height > v2.height + 10) && (v1.x <= v2.x + 5) && (v1.y <= v2.y + 5) && (v1.x + v1.width >= v2.x + v2.width - 5) && (v1.y + v1.height >= v2.y + v2.height - 5);
        const v2EnclosesV1 = (v2.width > v1.width + 10 && v2.height > v1.height + 10) && (v2.x <= v1.x + 5) && (v2.y <= v1.y + 5) && (v2.x + v2.width >= v1.x + v1.width - 5) && (v2.y + v2.height >= v1.y + v1.height - 5);

        if (v1EnclosesV2 || v2EnclosesV1) {
          continue;
        }

        const intersects = !(
          v1.x + v1.width <= v2.x ||
          v2.x + v2.width <= v1.x ||
          v1.y + v1.height <= v2.y ||
          v2.y + v2.height <= v1.y
        );

        if (intersects) {
          errors.push({
            code: 'OVERLAP',
            cells: [v1.id, v2.id],
            detail: `Direct geometric overlap between sibling nodes "${v1.id}" and "${v2.id}"`,
          });
        }
      }
    }
  }

  // Check EDGE_LABEL_MISSING_PILL
  for (const edge of edgesMap.values()) {
    const val = edge.label || '';
    const style = edge.style || '';
    if (val && val.trim().length > 0 && !style.includes('labelBackgroundColor=')) {
      warnings.push({
        code: 'EDGE_LABEL_MISSING_PILL',
        cells: [edge.id],
        detail: `Edge "${edge.id}" has label "${val.trim()}" but is missing high-contrast pill styling (labelBackgroundColor / labelBorderColor)`,
      });
    }
  }

  // Check EDGE_INTERSECTS_VERTEX & NON_ORTHOGONAL_EDGE_SEGMENT
  for (const [edgeId, edge] of edgesMap.entries()) {
    if (edge.source && edge.target && verticesMap.has(edge.source) && verticesMap.has(edge.target)) {
      const src = verticesMap.get(edge.source)!;
      const tgt = verticesMap.get(edge.target)!;

      const srcPt = {
        x: edge.exitX !== undefined ? src.absX + src.width * edge.exitX : src.absX + src.width / 2,
        y: edge.exitY !== undefined ? src.absY + src.height * edge.exitY : src.absY + src.height / 2,
      };
      const tgtPt = {
        x: edge.entryX !== undefined ? tgt.absX + tgt.width * edge.entryX : tgt.absX + tgt.width / 2,
        y: edge.entryY !== undefined ? tgt.absY + tgt.height * edge.entryY : tgt.absY + tgt.height / 2,
      };

      const points: { x: number; y: number }[] = [
        srcPt,
        ...(edge.points || []),
        tgtPt,
      ];

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);

        // NON-ORTHOGONAL SLANTED SEGMENT CHECK:
        // When an edge uses native orthogonal routing (edgeStyle=orthogonalEdgeStyle or orthogonal),
        // Draw.io automatically renders 90-degree right-angle Manhattan steps between waypoints.
        // For direct/unrouted edges (e.g. edgeStyle=none), slanted diagonal segments (dx > 3 && dy > 3) are strictly forbidden.
        const isOrthogonalRouted = edge.style?.includes('orthogonalEdgeStyle') || edge.style?.includes('edgeStyle=orthogonal') || edge.style?.includes('entityRelationEdgeStyle');
        if (!isOrthogonalRouted && dx > 3 && dy > 3) {
          errors.push({
            code: 'NON_ORTHOGONAL_EDGE_SEGMENT',
            cells: [edgeId],
            detail: `Edge "${edgeId}" has a slanted diagonal segment from (${p1.x}, ${p1.y}) to (${p2.x}, ${p2.y}) (dx=${dx}px, dy=${dy}px). All architecture connectors must be strictly orthogonal (90-degree right angles).`,
          });
        }

        const isHoriz = dy < 5;
        const isVert = dx < 5;

        for (const [vId, v] of verticesMap.entries()) {
          if (vId === edge.source || vId === edge.target || v.isLabelOrHeader) continue;

          if (v.isContainer) {
            const headerMinY = v.absY;
            const headerMaxY = v.absY + 20;
            if (isHoriz && p1.y >= headerMinY && p1.y <= headerMaxY) {
              const segMinX = Math.min(p1.x, p2.x);
              const segMaxX = Math.max(p1.x, p2.x);
              if (segMaxX > v.absX + 20 && segMinX < v.absX + v.width - 20) {
                errors.push({
                  code: 'CONTAINER_HEADER_SLICED',
                  cells: [edgeId, vId],
                  detail: `Edge segment on "${edgeId}" slices directly through the header text zone of container "${vId}" (Y=${p1.y})`,
                });
              }
            }
            continue;
          }

          if (isHoriz) {
            const segMinX = Math.min(p1.x, p2.x);
            const segMaxX = Math.max(p1.x, p2.x);
            if (p1.y > v.absY && p1.y < v.absY + v.height && segMaxX > v.absX + 5 && segMinX < v.absX + v.width - 5) {
              errors.push({
                code: 'EDGE_INTERSECTS_VERTEX',
                cells: [edgeId, vId],
                detail: `Horizontal edge segment on "${edgeId}" (Y=${p1.y}) slices through vertex "${vId}"`,
              });
            }
          }

          if (isVert) {
            const segMinY = Math.min(p1.y, p2.y);
            const segMaxY = Math.max(p1.y, p2.y);
            if (p1.x > v.absX && p1.x < v.absX + v.width && segMaxY > v.absY + 5 && segMinY < v.absY + v.height - 5) {
              errors.push({
                code: 'EDGE_INTERSECTS_VERTEX',
                cells: [edgeId, vId],
                detail: `Vertical edge segment on "${edgeId}" (X=${p1.x}) slices through vertex "${vId}"`,
              });
            }
          }
        }
      }
    }
  }

  // Check CARD_TEXT_OVERFLOW
  for (const [id, v] of verticesMap.entries()) {
    if (!v.isContainer && !v.isLabelOrHeader && v.label) {
      const lineCount = (v.label.match(/<br\s*\/?>|<p>/gi) || []).length + 1;
      const hasIcon = v.label.includes('<svg') || v.label.includes('ICONS');
      const minRequiredHeight = (hasIcon ? 18 : 8) + lineCount * 8.5;
      if (v.height < minRequiredHeight) {
        errors.push({
          code: 'TEXT_OVERFLOW_HEIGHT',
          cells: [id],
          detail: `Node "${id}" height (${v.height}px) is insufficient for ${lineCount} text lines with icon (requires >= ${Math.round(minRequiredHeight)}px)`,
        });
      }
    }
  }

  // --- STRICT TOPOLOGICAL & ARCHITECTURAL ERROR RULES ---

  // 1. HARD BLOCKING ORPHAN_NODE RULE
  for (const [id, v] of verticesMap.entries()) {
    const isFoundation = id.startsWith('cloud_') && (id.includes('monitoring') || id.includes('iam') || id.includes('vpc') || id.includes('telemetry') || id.includes('governance'));
    const isEnclosedInConnectedContainer = Array.from(verticesMap.values()).some(
      (c) =>
        c.isContainer &&
        c.id !== id &&
        connectedNodeIds.has(c.id) &&
        v.absX >= c.absX - 2 &&
        v.absY >= c.absY - 2 &&
        v.absX + v.width <= c.absX + c.width + 2 &&
        v.absY + v.height <= c.absY + c.height + 2
    );
    if (!v.isContainer && !v.isLabelOrHeader && !isFoundation && !connectedNodeIds.has(id) && !isEnclosedInConnectedContainer) {
      errors.push({
        code: 'ORPHAN_NODE',
        cells: [id],
        detail: `Critical architecture component "${id}" is completely disconnected from dataflow (0 connected edges).`,
      });
    }
  }

  // 2. HARD BLOCKING DATA_STORE_DISCONNECTED RULE
  for (const [id, v] of verticesMap.entries()) {
    const isDatabase = id.includes('db') || id.includes('spanner') || id.includes('bigquery') || id.includes('sql') || id.includes('vector_search') || id.includes('redis') || id.includes('memorystore');
    if (isDatabase && !v.isLabelOrHeader && !v.isContainer) {
      const hasIncoming = Array.from(edgesMap.values()).some(e => e.target === id);
      const hasOutgoing = Array.from(edgesMap.values()).some(e => e.source === id);
      if (!hasIncoming && !hasOutgoing) {
        errors.push({
          code: 'DATA_STORE_DISCONNECTED',
          cells: [id],
          detail: `Data store "${id}" is completely disconnected from dataflow (0 incoming and 0 outgoing edges).`,
        });
      }
    }
  }

  // 3. HARD BLOCKING FLOW_BACKTRACKING_DETECTED RULE
  for (const [edgeId, edge] of edgesMap.entries()) {
    if (edge.source && edge.target && verticesMap.has(edge.source) && verticesMap.has(edge.target)) {
      const src = verticesMap.get(edge.source)!;
      const tgt = verticesMap.get(edge.target)!;
      const isForwardCol = tgt.absX > src.absX + 50;
      const isUpwardBacktrack = (src.absY - tgt.absY) > 220;
      const isFeedbackLoop = (edge.label?.toLowerCase().includes('feedback') || edge.label?.toLowerCase().includes('eval') || edge.label?.toLowerCase().includes('retry') || edge.label?.toLowerCase().includes('correction'));

      if (isForwardCol && isUpwardBacktrack && !isFeedbackLoop) {
        errors.push({
          code: 'FLOW_BACKTRACKING_DETECTED',
          cells: [edgeId, edge.source, edge.target],
          detail: `Forward edge "${edgeId}" backtracks upward by ${Math.round(src.absY - tgt.absY)}px from "${edge.source}" to "${edge.target}". Ingress flow must branch forward cleanly without backtracking.`,
        });
      }
    }
  }

  // 4. CLOSED_LOOP_MISSING_EDGE RULE
  const hasClosedLoopClaim = Array.from(verticesMap.values()).some(v => v.label?.toLowerCase().includes('closed-loop') || v.label?.toLowerCase().includes('continuous feedback'));
  if (hasClosedLoopClaim) {
    const hasReturnEdge = Array.from(edgesMap.values()).some(e => {
      if (!e.source || !e.target || !verticesMap.has(e.source) || !verticesMap.has(e.target)) return false;
      const src = verticesMap.get(e.source)!;
      const tgt = verticesMap.get(e.target)!;
      return src.absX > tgt.absX + 200;
    });

    if (!hasReturnEdge) {
      errors.push({
        code: 'CLOSED_LOOP_MISSING_EDGE',
        cells: [],
        detail: `Diagram claims "Closed-Loop Feedback" in banner/title, but has no physical return connector vector in the graph model.`,
      });
    }
  }

  // 5. UNCONNECTED_LOAD_BALANCER RULE
  for (const [id, v] of verticesMap.entries()) {
    if (id.includes('load_balancer') || id.includes('gclb')) {
      const hasIncoming = Array.from(edgesMap.values()).some(e => e.target === id);
      const hasOutgoing = Array.from(edgesMap.values()).some(e => e.source === id);
      if (!hasIncoming || !hasOutgoing) {
        errors.push({
          code: 'UNCONNECTED_LOAD_BALANCER',
          cells: [id],
          detail: `Load balancer "${id}" is disconnected from ingress flow (Incoming: ${hasIncoming}, Outgoing: ${hasOutgoing}).`,
        });
      }
    }
  }

  const isValid = errors.length === 0 && warnings.length === 0;

  return {
    valid: isValid,
    errors,
    warnings,
  };
}
