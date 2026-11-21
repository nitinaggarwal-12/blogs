// ============================================================================
// js/diagrams_atlas.js — Executive One-Slide-at-a-Time Diagrams Atlas,
// Maximize/Restore Studio (Draw.io & All Formats), and Blog Canvas Controller
// ============================================================================

(function () {
  let atlasScopeFilter = 'COMPENDIUM_54';
  let atlasGlobalViewMode = 'static'; // 'static' | 'animated' | 'inline-drawio' | 'svg' | 'side-by-side'
  let cardViewModes = {}; // diagramId -> mode
  let activeSlideIndex = 0; // Index within filtered items (One-Slide-at-a-Time view)
  let isAtlasStageMaximized = false;
  let isModalMaximized = false;
  let maximizedBlogCardId = null;
  let pendingInsertDiagramId = null;
  let activePlaceholderCanvasId = null;

  const INSERTED_DIAGRAMS_STORAGE_KEY = 'ge_blogs_inserted_diagrams_v2';

  function getAtlasManifest() {
    var m = window.SLIDE_DIAGRAMS_ATLAS_MANIFEST || window.SLIDE_DIAGRAMS_ATLAS;
    if (m && Array.isArray(m.items)) {
      return m;
    }
    return { items: [] };
  }

  function getAtlasItems() {
    return getAtlasManifest().items || [];
  }

  function getDiagramById(diagId) {
    const items = getAtlasItems();
    return items.find(d => d.diagramId === diagId || String(d.slideNumber) === String(diagId)) || null;
  }
  window.getAtlasDiagramById = getDiagramById;

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatSlideOrExtBadge(item) {
    if (!item) return 'Slide #01/38';
    const num = Number(item.slideNumber) || 1;
    if (num > 54 || item.inCompendium54 === false) {
      return `Ext #${String(Math.max(1, num - 54)).padStart(2, '0')}/28`;
    }
    return `Slide #${String(num).padStart(2, '0')}/38`;
  }

  function getRoleBadgeHtml(role) {
    if (role === 'ARCH_DIAGRAM' || role === 'ARCHITECTURE_DIAGRAM') {
      return '<span class="badge badge-blue" style="font-size:10.5px;">📐 Architecture Diagram</span>';
    }
    if (role === 'SECTION_FRAMING') {
      return '<span class="badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:10.5px;">📑 Section Framing</span>';
    }
    return '<span class="badge badge-amber" style="font-size:10.5px;">📚 Extended Blueprint</span>';
  }

  function getBlockerBadgeHtml(blkId, spreadsheetUrl) {
    if (!blkId || blkId === 'ALL-BLK') {
      return `<a href="${escHtml(spreadsheetUrl || '#')}" target="_blank" rel="noopener noreferrer" class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; font-size:10.5px; text-decoration:none;" title="Open Multi-Tenant Blockers & Solutions Matrix">📋 All Blockers (BLK-01..06) &nearr;</a>`;
    }
    return `<a href="${escHtml(spreadsheetUrl || '#')}" target="_blank" rel="noopener noreferrer" class="badge" style="background:#fff1f2; color:#be123c; border:1px solid #fda4af; font-size:10.5px; font-weight:700; text-decoration:none;" title="Open ${escHtml(blkId)} in Solutions Matrix Spreadsheet">🛡️ ${escHtml(blkId)} &nearr;</a>`;
  }

  function buildVisualStageHtml(item, mode, contextPrefix, isMaximized) {
    const diagId = item.diagramId;
    const sNum = String(item.slideNumber).padStart(2, '0');
    const staticUrl = (item.assets && item.assets.staticPngUrl) || `/diagrams/compendium/static/slide-${sNum}.png`;
    const animUrl = (item.assets && item.assets.animatedGifUrl) || `/diagrams/compendium/animated/anim-slide-${sNum}.gif`;
    const svgUrl = (item.assets && item.assets.svgUrl) || `/diagrams/compendium/drawio/${diagId}.svg`;
    const studioEditUrl = (item.assets && item.assets.drawio2WayStudioUrl) || `/drawio/${encodeURIComponent(diagId)}?compSlide=${item.slideNumber}&mode=edit`;

    const maxImgHeight = isMaximized ? 'calc(100vh - 175px)' : (contextPrefix === 'atlas' ? '62vh' : '460px');
    const iframeHeight = isMaximized ? 'calc(100vh - 165px)' : (contextPrefix === 'atlas' ? '62vh' : '520px');
    const maxBtnAction = contextPrefix === 'atlas'
      ? `toggleAtlasStageMaximize()`
      : `toggleBlogDiagramCardMaximize('${escHtml(contextPrefix)}')`;
    const maxBtnLabel = isMaximized ? '🗗 Restore' : '⛶ Maximize';

    const cornerMaxPillHtml = '';

    if (mode === 'inline-drawio') {
      return `
        <div style="background:#ffffff; border:1.5px solid #1a73e8; border-radius:8px; overflow:hidden; position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 12px; background:#eff6ff; border-bottom:1px solid #bfdbfe; font-size:11.5px; font-weight:700; color:#1e3a8a;">
            <span>✏️ Live 2-Way Draw.io ↔ Google Slides Editor (${escHtml(diagId)})</span>
            <div style="display:flex; gap:6px; align-items:center;">
              <button type="button" class="sim-btn" style="padding:3px 9px; font-size:11px;" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'static', '${escHtml(contextPrefix)}')">✕ Exit Draw.io</button>
            </div>
          </div>
          <iframe class="atlas-inline-drawio-iframe" src="${escHtml(studioEditUrl)}" style="width:100%; height:${iframeHeight}; min-height:480px; border:0; display:block; background:#ffffff;" title="Inline 2-Way Draw.io Editor for ${escHtml(diagId)}"></iframe>
        </div>`;
    }

    if (mode === 'side-by-side') {
      return `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; position:relative;">
          ${cornerMaxPillHtml}
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${escHtml(staticUrl)}', '${escHtml(item.title)} (Static 2-Way Slide)')">
            <div style="padding:5px 10px; background:#f8fafc; color:#1e293b; font-size:10.5px; font-weight:700; border-bottom:1px solid #e2e8f0;">🖼️ Static Slide (Deck 1 • 2-Way Editable)</div>
            <img src="${escHtml(staticUrl)}" alt="${escHtml(item.title)} Static" style="width:100%; max-height:${maxImgHeight}; object-fit:contain; display:block; margin:0 auto; background:#ffffff;" />
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${escHtml(animUrl)}', '${escHtml(item.title)} (Animated GIF Flow)')">
            <div style="padding:5px 10px; background:#f8fafc; color:#047857; font-size:10.5px; font-weight:700; border-bottom:1px solid #e2e8f0;">🎬 Animated Flow (Deck 2 • N-Step Spotlight)</div>
            <img src="${escHtml(animUrl)}" alt="${escHtml(item.title)} Animated" style="width:100%; max-height:${maxImgHeight}; object-fit:contain; display:block; margin:0 auto; background:#ffffff;" />
          </div>
        </div>`;
    }

    if (mode === 'animated') {
      return `
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; position:relative; display:flex; align-items:center; justify-content:center;">
          ${cornerMaxPillHtml}
          <img src="${escHtml(animUrl)}" alt="${escHtml(item.title)} Animated Flow" onclick="openGenuineScreenshotLightbox('${escHtml(animUrl)}', '${escHtml(item.title)} (Animated GIF Flow)')" style="width:auto; max-width:100%; max-height:${maxImgHeight}; object-fit:contain; display:block; margin:0 auto; background:#ffffff; border-radius:6px; border:1px solid #e2e8f0; cursor:zoom-in; box-shadow:0 2px 10px rgba(15,23,42,0.04);" />
        </div>`;
    }

    if (mode === 'svg') {
      return `
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; position:relative; display:flex; align-items:center; justify-content:center;">
          ${cornerMaxPillHtml}
          <img src="${escHtml(svgUrl)}" alt="${escHtml(item.title)} Vector SVG" onclick="openGenuineScreenshotLightbox('${escHtml(svgUrl)}', '${escHtml(item.title)} (Vector SVG)')" style="width:auto; max-width:100%; max-height:${maxImgHeight}; object-fit:contain; display:block; margin:0 auto; background:#ffffff; border-radius:6px; border:1px solid #e2e8f0; cursor:zoom-in; box-shadow:0 2px 10px rgba(15,23,42,0.04);" />
        </div>`;
    }

    // Default: 'static'
    return `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; position:relative; display:flex; align-items:center; justify-content:center;">
        ${cornerMaxPillHtml}
        <img src="${escHtml(staticUrl)}" alt="${escHtml(item.title)}" onclick="openGenuineScreenshotLightbox('${escHtml(staticUrl)}', '${escHtml(item.title)}')" style="width:auto; max-width:100%; max-height:${maxImgHeight}; object-fit:contain; display:block; margin:0 auto; background:#ffffff; border-radius:6px; border:1px solid #e2e8f0; cursor:zoom-in; box-shadow:0 2px 10px rgba(15,23,42,0.04);" />
      </div>`;
  }

  function buildSingleSlideExecutiveStageHtml(item, filteredList, currentIdx) {
    const diagId = item.diagramId;
    const sNum = String(item.slideNumber).padStart(2, '0');
    const mode = cardViewModes[diagId] || atlasGlobalViewMode || 'static';
    const lnk = item.linkages || {};
    const flt = item.filters || {};
    const ast = item.assets || {};
    const cardDomId = `atlas-card-s${sNum}-${diagId}`;
    const totalFiltered = filteredList.length;

    const slideSelectOptions = filteredList.map((it, idx) => {
      const sn = String(it.slideNumber).padStart(2, '0');
      const sel = idx === currentIdx ? ' selected' : '';
      const prefix = it.inCompendium54 ? `Slide ${sn}/38` : `Ext #${String(it.slideNumber - 54).padStart(2, '0')}/28`;
      return `<option value="${idx}"${sel}>[${prefix}] ${escHtml(it.shortTitle || it.title)}</option>`;
    }).join('');

    const maxContainerStyle = isAtlasStageMaximized
      ? 'position:fixed; inset:0; width:100vw; height:100vh; z-index:10020; margin:0; border-radius:0; border:0; padding:14px 20px; background:#ffffff; display:flex; flex-direction:column; justify-content:space-between; overflow-y:auto; box-shadow:none;'
      : 'display:flex; flex-direction:column; justify-content:space-between; gap:10px; padding:14px 18px; border:1px solid #cbd5e1; border-radius:10px; background:#ffffff; position:relative; box-shadow:0 2px 8px rgba(15,23,42,0.04);';

    return `
      <article class="card diagram-atlas-card ${isAtlasStageMaximized ? 'atlas-stage-maximized atlas-stage-is-maximized' : ''}" id="atlas-single-slide-stage" data-card-id="atlas-single-slide-stage" data-card-type="diagram_atlas_card" data-card-title="${escHtml(item.title)}" data-diagram-id="${escHtml(diagId)}" data-slide-number="${item.slideNumber}" style="${maxContainerStyle}">
        <div class="card-editable-body" style="display:flex; flex-direction:column; gap:10px; flex:1;">
          <!-- Maximized Fullscreen Bar (Hidden in Normal Mode Since Unified Top Bar Controls Slide, Filter & Format) -->
          <div style="display:${isAtlasStageMaximized ? 'flex' : 'none'}; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-bottom:8px; border-bottom:1px solid #e2e8f0;" aria-hidden="${isAtlasStageMaximized ? 'false' : 'true'}">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <button type="button" class="sim-btn" onclick="prevAtlasSlide()" ${currentIdx <= 0 ? 'disabled' : ''} style="padding:4px 9px; font-size:11.5px; font-weight:700;">◀ Prev</button>
              <span class="badge badge-blue" style="font-size:11px; font-weight:800;">Slide ${currentIdx + 1} / ${totalFiltered}</span>
              <button type="button" class="sim-btn" onclick="nextAtlasSlide()" ${currentIdx >= totalFiltered - 1 ? 'disabled' : ''} style="padding:4px 9px; font-size:11.5px; font-weight:700;">Next ▶</button>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" class="sim-btn ${mode === 'static' ? 'primary' : ''}" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'static', 'atlas')">🖼️ Slide</button>
              <button type="button" class="sim-btn ${mode === 'animated' ? 'primary' : ''}" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'animated', 'atlas')">🎬 Animated</button>
              <button type="button" class="sim-btn ${mode === 'inline-drawio' ? 'primary' : ''}" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'inline-drawio', 'atlas')">✏️ Draw.io 2-Way</button>
              <button type="button" class="sim-btn ${mode === 'svg' ? 'primary' : ''}" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'svg', 'atlas')">📐 SVG</button>
              <button type="button" class="sim-btn ${mode === 'side-by-side' ? 'primary' : ''}" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'side-by-side', 'atlas')">⚡ Compare</button>
              <button type="button" class="sim-btn primary" onclick="toggleAtlasStageMaximize(false)" style="padding:4px 10px; font-size:11.5px; font-weight:800;">🗗 Restore</button>
            </div>
          </div>

          <!-- Clean Slide Title & Key Badges -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-right:${isAtlasStageMaximized ? '0' : '175px'};">
            <h3 class="atlas-card-title" style="margin:0; font-size:15.5px; font-weight:800; color:#0f172a; line-height:1.3;">
              ${escHtml(item.title)}
            </h3>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <code style="font-size:11px; background:#f8fafc; color:#334155; padding:2px 7px; border-radius:4px; border:1px solid #cbd5e1; font-weight:700;">${escHtml(diagId)}</code>
              ${getRoleBadgeHtml(flt.slideRole)}
              ${getBlockerBadgeHtml(lnk.blockerId, lnk.spreadsheetUrl)}
            </div>
          </div>

          <!-- Row 3: Primary Visual Stage (One Slide at a Time) -->
          <div id="atlas-stage-${escHtml(diagId)}" style="flex:1;">
            ${buildVisualStageHtml(item, mode, 'atlas', isAtlasStageMaximized)}
          </div>

          <!-- Row 4: Clean 3-Column Executive Summary Footer (Purpose, Linkages, Actions) -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px; padding-top:8px; border-top:1px solid #e2e8f0; align-items:stretch;">
            <!-- Col 1: Purpose -->
            <div class="atlas-card-purpose" style="background:#f8fafc; border-left:3px solid #1a73e8; border-radius:6px; padding:8px 12px; font-size:12px; color:#1e293b; line-height:1.45;">
              <strong style="color:#0f172a; font-size:11px; text-transform:uppercase; letter-spacing:0.03em; display:block; margin-bottom:2px;">Purpose &amp; Guarantee</strong>
              <span>${escHtml(item.purpose)}</span>
            </div>

            <!-- Col 2: Linkages -->
            <div class="atlas-card-linkages" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; font-size:11.5px; color:#334155; display:flex; flex-direction:column; justify-content:center; gap:4px;">
              <div><strong>📖 Linked Blog:</strong> <a href="javascript:void(0)" onclick="openLinkedBlogFromAtlas('${escHtml(lnk.workstream || 'WS1')}', '${escHtml(lnk.blogDocPath || '')}', '${escHtml(lnk.blogAnchor || '')}')" style="color:#1a73e8; font-weight:700; text-decoration:none;">${escHtml(lnk.blogTitle || lnk.workstreamLabel || 'Open Blog')} &rarr;</a></div>
              <div><strong>🔗 Hop &amp; Blocker:</strong> ${escHtml(lnk.hopLayer || '5-Hop Runtime')} &bull; <a href="${escHtml(lnk.spreadsheetUrl || '#')}" target="_blank" rel="noopener noreferrer" style="color:#b45309; font-weight:700; text-decoration:none;">${escHtml(lnk.blockerId || 'Matrix')} &nearr;</a></div>
              <div><strong>📊 Slide Decks:</strong> ${item.inBareMinimum12 && lnk.bareMinSlideUrl ? `<a id="atlas-stage-btn-baremin" href="${escHtml(lnk.bareMinSlideUrl)}" target="_blank" rel="noopener noreferrer" style="color:#7c3aed; font-weight:700; text-decoration:none;">⚡ Bare-Min 12 (#${String(item.bareMinSlideNumber).padStart(2, '0')}) &nearr;</a> &bull; ` : ''}<a id="atlas-stage-btn-deck1" href="${escHtml(lnk.deck1SlideUrl || '#')}" target="_blank" rel="noopener noreferrer" style="color:#1a73e8; font-weight:700; text-decoration:none;">Deck 1 (${item.inCompendium54 !== false ? '#' + sNum + ' Editable' : 'Ext #' + String(item.slideNumber - 54).padStart(2, '0') + ' Section'}) &nearr;</a> &bull; <a id="atlas-stage-btn-deck2" href="${escHtml(lnk.deck2SlideUrl || '#')}" target="_blank" rel="noopener noreferrer" style="color:#047857; font-weight:700; text-decoration:none;">Deck 2 (${item.inCompendium54 !== false ? '#' + sNum + ' Animated' : 'Ext #' + String(item.slideNumber - 54).padStart(2, '0') + ' Section'}) &nearr;</a></div>
            </div>

            <!-- Col 3: Actions -->
            <div class="atlas-card-actions" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:6px;">
              <a href="${escHtml(lnk.deck1SlideUrl || '#')}" target="_blank" rel="noopener noreferrer" class="sim-btn" style="text-decoration:none; padding:5px 10px; font-size:11.5px; font-weight:700; background:#fffbeb; color:#b45309; border-color:#fde68a;">
                📊 Open in Slides &nearr;
              </a>
              <button type="button" class="sim-btn primary" onclick="openAtlas2WayStudioModal('${escHtml(diagId)}', 'edit')" style="padding:5px 10px; font-size:11.5px; font-weight:700;">
                ✏️ Draw.io 2-Way Studio
              </button>
              <button type="button" class="sim-btn" onclick="openAtlas2WayStudioModal('${escHtml(diagId)}', 'anim')" style="padding:5px 10px; font-size:11.5px; font-weight:700; background:#ecfdf5; color:#047857; border-color:#6ee7b7;">
                🎬 Animated Player
              </button>
              <button type="button" class="sim-btn" onclick="promptInsertDiagramIntoBlog('${escHtml(diagId)}')" style="padding:5px 10px; font-size:11.5px; font-weight:800; background:#eff6ff; color:#1d4ed8; border-color:#93c5fd;">
                ➕ Insert in Blog
              </button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function filterAtlasItemsList() {
    const items = getAtlasItems();
    const scopeEl = document.getElementById('atlas-filter-scope');
    if (scopeEl && scopeEl.value) {
      atlasScopeFilter = scopeEl.value;
    }
    const topoEl = document.getElementById('atlas-filter-topology');
    const patEl = document.getElementById('atlas-filter-pattern');
    const blkEl = document.getElementById('atlas-filter-blocker');
    const searchEl = document.getElementById('atlas-filter-search');

    const topoVal = topoEl ? topoEl.value : 'ALL';
    const patVal = patEl ? patEl.value : 'ALL';
    const blkVal = blkEl ? blkEl.value : 'ALL';
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';

    return items.filter(item => {
      const flt = item.filters || {};
      const lnk = item.linkages || {};

      if (atlasScopeFilter === 'BARE_MIN_12' && !item.inBareMinimum12) return false;
      if (atlasScopeFilter === 'COMPENDIUM_54' && !item.inCompendium54) return false;
      if (atlasScopeFilter === 'ARCH_DIAGRAM' && flt.slideRole !== 'ARCH_DIAGRAM' && flt.slideRole !== 'ARCHITECTURE_DIAGRAM') return false;
      if (atlasScopeFilter === 'SECTION_FRAMING' && flt.slideRole !== 'SECTION_FRAMING') return false;
      if (['OPENING', 'WS1', 'WS2', 'WS3', 'WS4', 'WS5'].includes(atlasScopeFilter)) {
        if (!item.inCompendium54 || flt.workstream !== atlasScopeFilter) return false;
      }

      if (topoVal !== 'ALL' && flt.topologyFamily !== topoVal) return false;
      if (patVal !== 'ALL') {
        const itemPat = String(flt.pattern || '');
        if (itemPat !== patVal && !(patVal.includes('Multi-Cloud') && itemPat.includes('Multi-Cloud'))) return false;
      }
      if (blkVal !== 'ALL') {
        const itemBlk = String(flt.blocker || lnk.blockerId || '');
        if (itemBlk !== blkVal && !itemBlk.startsWith(blkVal)) return false;
      }

      if (q) {
        const hay = [
          `slide ${item.slideNumber}`,
          `slide #${String(item.slideNumber).padStart(2, '0')}`,
          item.diagramId,
          item.title,
          item.shortTitle,
          item.purpose,
          lnk.blockerId,
          lnk.blockerLabel,
          lnk.hopLayer,
          lnk.blogTitle,
          flt.topologyFamily,
          flt.pattern
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  window.filterAtlasItemsList = filterAtlasItemsList;

  function updateAtlasDynamicFilterCounts() {
    const items = getAtlasItems();
    if (!items.length) return;
    const searchEl = document.getElementById('atlas-filter-search');
    const q = searchEl ? searchEl.value.trim().toLowerCase() : '';

    function matchesSearch(item) {
      if (!q) return true;
      const flt = item.filters || {};
      const lnk = item.linkages || {};
      const hay = [
        `slide ${item.slideNumber}`,
        `slide #${String(item.slideNumber).padStart(2, '0')}`,
        item.diagramId,
        item.title,
        item.shortTitle,
        item.purpose,
        lnk.blockerId,
        lnk.blockerLabel,
        lnk.hopLayer,
        lnk.blogTitle,
        flt.topologyFamily,
        flt.pattern
      ].join(' ').toLowerCase();
      return hay.includes(q);
    }

    function matchesScope(item, scopeVal) {
      const flt = item.filters || {};
      if (scopeVal === 'BARE_MIN_12') return Boolean(item.inBareMinimum12);
      if (scopeVal === 'COMPENDIUM_54') return Boolean(item.inCompendium54);
      if (scopeVal === 'ARCH_DIAGRAM') return flt.slideRole === 'ARCH_DIAGRAM' || flt.slideRole === 'ARCHITECTURE_DIAGRAM';
      if (scopeVal === 'SECTION_FRAMING') return flt.slideRole === 'SECTION_FRAMING';
      if (['OPENING', 'WS1', 'WS2', 'WS3', 'WS4', 'WS5'].includes(scopeVal)) {
        return Boolean(item.inCompendium54) && flt.workstream === scopeVal;
      }
      return true;
    }

    const scopeEl = document.getElementById('atlas-filter-scope');
    if (scopeEl) {
      Array.from(scopeEl.options).forEach(opt => {
        const base = opt.getAttribute('data-base-label') || opt.textContent.replace(/\s*\(\d+\)$/, '');
        opt.setAttribute('data-base-label', base);
        const cnt = items.filter(it => matchesScope(it, opt.value) && matchesSearch(it)).length;
        opt.textContent = `${base} (${cnt})`;
      });
    }

    const consEl = document.getElementById('atlas-filter-consolidated');
    if (consEl) {
      const activeScope = scopeEl ? scopeEl.value : atlasScopeFilter;
      const scopedItems = items.filter(it => matchesScope(it, activeScope) && matchesSearch(it));
      Array.from(consEl.querySelectorAll('option')).forEach(opt => {
        const base = opt.getAttribute('data-base-label') || opt.textContent.replace(/\s*\(\d+\)$/, '');
        opt.setAttribute('data-base-label', base);
        const val = opt.value;
        let cnt = scopedItems.length;
        if (val === 'ALL') {
          cnt = items.filter(it => matchesScope(it, 'COMPENDIUM_54') && matchesSearch(it)).length;
        } else if (val.startsWith('SCOPE:')) {
          const sVal = val.slice(6);
          cnt = items.filter(it => matchesScope(it, sVal) && matchesSearch(it)).length;
        } else if (val.startsWith('TOPO:')) {
          const tVal = val.slice(5);
          cnt = scopedItems.filter(it => (it.filters || {}).topologyFamily === tVal).length;
        } else if (val.startsWith('PAT:')) {
          const pVal = val.slice(4);
          cnt = scopedItems.filter(it => {
            const ip = String((it.filters || {}).pattern || '');
            return ip === pVal || (pVal.includes('Multi-Cloud') && ip.includes('Multi-Cloud'));
          }).length;
        } else if (val.startsWith('BLK:')) {
          const bVal = val.slice(4);
          cnt = scopedItems.filter(it => {
            const ib = String((it.filters || {}).blocker || (it.linkages || {}).blockerId || '');
            return ib === bVal || ib.startsWith(bVal);
          }).length;
        }
        opt.textContent = `${base} (${cnt})`;
      });
    }
  }
  window.updateAtlasDynamicFilterCounts = updateAtlasDynamicFilterCounts;

  window.handleAtlasConsolidatedFacetChange = function handleAtlasConsolidatedFacetChange(val) {
    const scopeEl = document.getElementById('atlas-filter-scope');
    const topoEl = document.getElementById('atlas-filter-topology');
    const patEl = document.getElementById('atlas-filter-pattern');
    const blkEl = document.getElementById('atlas-filter-blocker');
    if (topoEl) topoEl.value = 'ALL';
    if (patEl) patEl.value = 'ALL';
    if (blkEl) blkEl.value = 'ALL';
    if (!val || val === 'ALL') {
      atlasScopeFilter = 'COMPENDIUM_54';
      if (scopeEl) scopeEl.value = 'COMPENDIUM_54';
    } else if (val.startsWith('SCOPE:')) {
      const sVal = val.slice(6);
      atlasScopeFilter = sVal;
      if (scopeEl) scopeEl.value = sVal;
    } else if (val.startsWith('TOPO:') && topoEl) {
      topoEl.value = val.slice(5);
    } else if (val.startsWith('PAT:') && patEl) {
      patEl.value = val.slice(4);
    } else if (val.startsWith('BLK:') && blkEl) {
      blkEl.value = val.slice(4);
    }
    activeSlideIndex = 0;
    renderDiagramsAtlasGrid();
  };

  window.getCurrentAtlasDiagramId = function getCurrentAtlasDiagramId() {
    const filtered = filterAtlasItemsList();
    const cur = filtered[activeSlideIndex] || filtered[0];
    return cur ? cur.diagramId : 's00-compendium-master-cover';
  };

  function renderDiagramsAtlasGrid() {
    const gridEl = document.getElementById('diagrams-atlas-grid');
    if (!gridEl) return;
    updateAtlasDynamicFilterCounts();
    const filtered = filterAtlasItemsList();
    if (activeSlideIndex >= filtered.length) {
      activeSlideIndex = 0;
    }
    if (activeSlideIndex < 0) {
      activeSlideIndex = 0;
    }

    const countLabel = document.getElementById('atlas-results-count-label');
    if (countLabel) {
      countLabel.textContent = filtered.length > 0
        ? `Slide ${activeSlideIndex + 1} of ${filtered.length}`
        : `0 Matching Slides`;
    }

    const topSlideSelect = document.getElementById('atlas-slide-select');
    const prevBtn = document.getElementById('atlas-prev-slide-btn');
    const nextBtn = document.getElementById('atlas-next-slide-btn');
    const fmtSelect = document.getElementById('atlas-format-select');
    const maxBtn = document.getElementById('atlas-btn-maximize-restore');

    if (topSlideSelect) {
      if (filtered.length > 0) {
        topSlideSelect.innerHTML = filtered.map((it, idx) => {
          const sn = String(it.slideNumber).padStart(2, '0');
          const sel = idx === activeSlideIndex ? ' selected' : '';
          const prefix = (atlasScopeFilter === 'BARE_MIN_12' && it.bareMinSlideNumber)
            ? `Bare-Min ${String(it.bareMinSlideNumber).padStart(2, '0')}/12 • S${sn}`
            : (it.inCompendium54 ? `Slide ${sn}/38` : `Ext #${String(it.slideNumber - 54).padStart(2, '0')}/28`);
          const rawLabel = String(it.shortTitle || it.title || '').replace(/\s*[:—–-]\s*Enterprise Multi-Tenancy.*$/i, '');
          const cleanLabel = rawLabel.length > 36 ? rawLabel.slice(0, 34).trim() + '…' : rawLabel;
          return `<option value="${idx}"${sel}>[${prefix}] ${escHtml(cleanLabel)}</option>`;
        }).join('');
        topSlideSelect.disabled = false;
      } else {
        topSlideSelect.innerHTML = '<option value="0">0 Matching Slides</option>';
        topSlideSelect.disabled = true;
      }
    }
    if (prevBtn) prevBtn.disabled = (activeSlideIndex <= 0 || filtered.length === 0);
    if (nextBtn) nextBtn.disabled = (activeSlideIndex >= filtered.length - 1 || filtered.length === 0);

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="card" style="text-align:center; padding:32px; background:#ffffff; border:1px dashed #cbd5e1;">
          <div style="font-size:15px; font-weight:700; color:#0f172a; margin-bottom:6px;">No diagrams match the active filter conditions</div>
          <p class="muted" style="margin:0 0 12px 0; font-size:12.5px;">Try clearing the search query or resetting the Topology, Pattern, or Blocker dropdowns.</p>
          <button type="button" class="sim-btn primary" onclick="resetAtlasFilters()">Reset All Filters</button>
        </div>`;
      return;
    }

    const currentItem = filtered[activeSlideIndex];
    const activeMode = cardViewModes[currentItem.diagramId] || atlasGlobalViewMode || 'static';
    if (fmtSelect) fmtSelect.value = activeMode;
    if (maxBtn) {
      maxBtn.textContent = isAtlasStageMaximized ? '🗗 Restore' : '⛶ Maximize';
      maxBtn.classList.toggle('primary', isAtlasStageMaximized);
      maxBtn.style.color = isAtlasStageMaximized ? '#ffffff' : '#1a73e8';
    }

    gridEl.innerHTML = buildSingleSlideExecutiveStageHtml(currentItem, filtered, activeSlideIndex);
    if (typeof window.initAllPortalCardHoverToolbars === 'function') {
      window.initAllPortalCardHoverToolbars();
    }
  }
  window.renderDiagramsAtlasGrid = renderDiagramsAtlasGrid;

  function syncAtlasUrlForCurrentSlide(item) {
    if (!item) return;
    try {
      const tabDiagrams = document.getElementById('tab-diagrams');
      const isDiagramsActive = (tabDiagrams && tabDiagrams.classList.contains('active')) ||
        window.__STANDALONE_DIAGRAMS_PAGE ||
        window.location.pathname.startsWith('/slide-diagrams') ||
        window.location.pathname.startsWith('/diagrams-atlas');
      if (!isDiagramsActive) return;
      const sNum = String(item.slideNumber).padStart(2, '0');
      const mode = cardViewModes[item.diagramId] || atlasGlobalViewMode || 'static';
      const modeParam = mode !== 'static' ? `&mode=${encodeURIComponent(mode)}` : '';
      const newUrl = `/slide-diagrams/${sNum}?diagram=${encodeURIComponent(item.diagramId)}${modeParam}`;
      if (window.location.pathname + window.location.search !== newUrl) {
        window.history.replaceState({ slideNumber: item.slideNumber, diagramId: item.diagramId }, '', newUrl);
      }
    } catch (_) {}
  }

  window.copyCurrentAtlasSlideUrl = function copyCurrentAtlasSlideUrl(btnEl, slideNum, diagId) {
    const filtered = filterAtlasItemsList();
    const cur = filtered[activeSlideIndex] || filtered[0];
    const sNum = String(slideNum || (cur ? cur.slideNumber : 1)).padStart(2, '0');
    const resolvedId = diagId || (cur ? cur.diagramId : '');
    const url = `${window.location.origin}/slide-diagrams/${sNum}?diagram=${encodeURIComponent(resolvedId)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    if (btnEl) {
      const orig = btnEl.textContent;
      btnEl.textContent = '✅ Copied!';
      setTimeout(() => { btnEl.textContent = orig; }, 1400);
    }
  };

  window.selectAtlasSlideByIndex = function selectAtlasSlideByIndex(idx) {
    const filtered = filterAtlasItemsList();
    if (!filtered.length) return;
    activeSlideIndex = Math.max(0, Math.min(filtered.length - 1, Number(idx) || 0));
    renderDiagramsAtlasGrid();
    syncAtlasUrlForCurrentSlide(filtered[activeSlideIndex]);
  };

  window.prevAtlasSlide = function prevAtlasSlide() {
    const filtered = filterAtlasItemsList();
    if (!filtered.length) return;
    if (activeSlideIndex > 0) {
      activeSlideIndex--;
      renderDiagramsAtlasGrid();
      syncAtlasUrlForCurrentSlide(filtered[activeSlideIndex]);
    }
  };

  window.nextAtlasSlide = function nextAtlasSlide() {
    const filtered = filterAtlasItemsList();
    if (!filtered.length) return;
    if (activeSlideIndex < filtered.length - 1) {
      activeSlideIndex++;
      renderDiagramsAtlasGrid();
      syncAtlasUrlForCurrentSlide(filtered[activeSlideIndex]);
    }
  };

  window.toggleAtlasStageMaximize = function toggleAtlasStageMaximize(forceState) {
    isAtlasStageMaximized = typeof forceState === 'boolean' ? forceState : !isAtlasStageMaximized;
    renderDiagramsAtlasGrid();
  };

  window.setAtlasScopeFilter = function setAtlasScopeFilter(scope) {
    atlasScopeFilter = scope;
    const scopeEl = document.getElementById('atlas-filter-scope');
    if (scopeEl && scopeEl.value !== scope) {
      scopeEl.value = scope;
    }
    activeSlideIndex = 0;
    renderDiagramsAtlasGrid();
  };

  window.applyAtlasFilters = function applyAtlasFilters() {
    activeSlideIndex = 0;
    renderDiagramsAtlasGrid();
  };

  window.resetAtlasFilters = function resetAtlasFilters() {
    atlasScopeFilter = 'COMPENDIUM_54';
    activeSlideIndex = 0;
    const scopeEl = document.getElementById('atlas-filter-scope');
    const consEl = document.getElementById('atlas-filter-consolidated');
    const topoEl = document.getElementById('atlas-filter-topology');
    const patEl = document.getElementById('atlas-filter-pattern');
    const blkEl = document.getElementById('atlas-filter-blocker');
    const searchEl = document.getElementById('atlas-filter-search');
    if (scopeEl) scopeEl.value = 'COMPENDIUM_54';
    if (consEl) consEl.value = 'ALL';
    if (topoEl) topoEl.value = 'ALL';
    if (patEl) patEl.value = 'ALL';
    if (blkEl) blkEl.value = 'ALL';
    if (searchEl) searchEl.value = '';
    renderDiagramsAtlasGrid();
  };
  window.resetDiagramAtlasFilters = window.resetAtlasFilters;

  window.setAtlasGlobalViewMode = function setAtlasGlobalViewMode(mode) {
    atlasGlobalViewMode = mode;
    cardViewModes = {};
    renderDiagramsAtlasGrid();
  };

  window.setAtlasCardViewMode = function setAtlasCardViewMode(diagId, mode, contextPrefix) {
    cardViewModes[diagId] = mode;
    const item = getDiagramById(diagId);
    if (!item) return;
    if (contextPrefix === 'atlas') {
      renderDiagramsAtlasGrid();
    } else if (contextPrefix && contextPrefix.startsWith('blog-ins-')) {
      const cardEl = document.getElementById(contextPrefix);
      const isMax = maximizedBlogCardId === contextPrefix;
      if (cardEl) {
        cardEl.innerHTML = buildInsertedDiagramCardInnerHtml(contextPrefix, item, mode, isMax);
        if (typeof window.initAllPortalCardHoverToolbars === 'function') {
          window.initAllPortalCardHoverToolbars();
        }
      }
      persistInsertedBlogDiagram(contextPrefix, diagId, mode, '');
    }
  };
  window.switchInsertedBlogDiagramView = function switchInsertedBlogDiagramView(canvasId, diagId, mode) {
    window.setAtlasCardViewMode(diagId, mode === 'drawio' ? 'inline-drawio' : mode, canvasId);
  };

  window.toggleBlogDiagramCardMaximize = function toggleBlogDiagramCardMaximize(canvasId, forceState) {
    const cardEl = document.getElementById(canvasId) || document.querySelector(`[data-card-id="${canvasId}"]`);
    if (!cardEl) return;
    const diagId = cardEl.getAttribute('data-diagram-id') || cardEl.getAttribute('data-diag-id');
    const item = getDiagramById(diagId);
    const shouldMax = typeof forceState === 'boolean' ? forceState : (maximizedBlogCardId !== canvasId);
    maximizedBlogCardId = shouldMax ? canvasId : null;

    if (shouldMax) {
      cardEl.classList.add('blog-diagram-card-maximized');
      cardEl.style.cssText = 'position:fixed; inset:0; width:100vw; height:100vh; z-index:10020; margin:0; border-radius:0; border:0; padding:16px 22px; background:#ffffff; display:flex; flex-direction:column; justify-content:space-between; overflow-y:auto;';
    } else {
      cardEl.classList.remove('blog-diagram-card-maximized');
      cardEl.style.cssText = 'border:1.5px solid #cbd5e1; background:#ffffff; border-radius:10px; padding:14px 16px; margin:14px 0; position:relative; box-shadow:0 2px 8px rgba(15,23,42,0.04);';
    }
    if (item && canvasId.startsWith('blog-ins-')) {
      const mode = cardViewModes[item.diagramId] || 'static';
      cardEl.innerHTML = buildInsertedDiagramCardInnerHtml(canvasId, item, mode, shouldMax);
      if (typeof window.initAllPortalCardHoverToolbars === 'function') {
        window.initAllPortalCardHoverToolbars();
      }
    } else {
      const img = cardEl.querySelector('img');
      const ifr = cardEl.querySelector('iframe');
      if (img) {
        img.style.width = shouldMax ? 'auto' : '100%';
        img.style.maxWidth = '100%';
        img.style.maxHeight = shouldMax ? 'calc(100vh - 115px)' : '760px';
        img.style.margin = '0 auto';
      }
      if (ifr) {
        ifr.style.height = shouldMax ? 'calc(100vh - 110px)' : '640px';
      }
    }
  };

  window.toggleGenericDiagramCardMaximize = function toggleGenericDiagramCardMaximize(cardId, btnId, forceState) {
    const cardEl = document.getElementById(cardId);
    if (!cardEl) return;
    const isCurrentlyMax = cardEl.classList.contains('blog-diagram-card-maximized');
    const shouldMax = typeof forceState === 'boolean' ? forceState : !isCurrentlyMax;
    maximizedBlogCardId = shouldMax ? cardId : null;
    const btnEl = btnId ? document.getElementById(btnId) : cardEl.querySelector('[data-max-restore-btn]');
    if (shouldMax) {
      if (!cardEl.hasAttribute('data-orig-style')) {
        cardEl.setAttribute('data-orig-style', cardEl.getAttribute('style') || '');
      }
      cardEl.classList.add('blog-diagram-card-maximized');
      cardEl.style.cssText = 'position:fixed; inset:0; width:100vw; height:100vh; z-index:10020; margin:0; border-radius:0; border:0; padding:16px 24px; background:#ffffff; display:flex; flex-direction:column; overflow-y:auto;';
    } else {
      cardEl.classList.remove('blog-diagram-card-maximized');
      cardEl.setAttribute('style', cardEl.getAttribute('data-orig-style') || 'padding:12px 14px;');
    }
    const img = cardEl.querySelector('img');
    const ifr = cardEl.querySelector('iframe');
    if (img) {
      img.style.width = shouldMax ? 'auto' : '100%';
      img.style.maxWidth = '100%';
      img.style.maxHeight = shouldMax ? 'calc(100vh - 120px)' : '760px';
      img.style.margin = '0 auto';
    }
    if (ifr) {
      ifr.style.height = shouldMax ? 'calc(100vh - 110px)' : '640px';
    }
    if (btnEl) {
      btnEl.textContent = shouldMax ? '🗗 Restore' : '⛶ Maximize';
      btnEl.classList.toggle('primary', shouldMax);
    }
  };

  window.openLinkedBlogFromAtlas = function openLinkedBlogFromAtlas(wsKey, docPath, anchor) {
    if (isAtlasStageMaximized) {
      isAtlasStageMaximized = false;
    }
    const tabBtn = document.getElementById('tab-btn-patterns');
    if (typeof window.switchTab === 'function') {
      window.switchTab('patterns', tabBtn);
    }
    if (typeof window.selectGuidedWorkstream === 'function' && wsKey && wsKey !== 'ALL') {
      window.selectGuidedWorkstream(wsKey, docPath || null, anchor || '');
    } else if (typeof window.openDocInReader === 'function' && docPath) {
      window.openDocInReader(docPath, anchor || '');
    }
  };

  window.openAtlas2WayStudioModal = function openAtlas2WayStudioModal(diagId, mode) {
    const item = getDiagramById(diagId) || getAtlasItems()[0];
    if (!item) return;
    const modal = document.getElementById('atlas-drawio-2way-modal');
    const iframe = document.getElementById('atlas-2way-modal-iframe');
    const badge = document.getElementById('atlas-2way-modal-slide-badge');
    const title = document.getElementById('atlas-2way-modal-title');
    const link1 = document.getElementById('atlas-2way-modal-slides1-link');
    const link2 = document.getElementById('atlas-2way-modal-slides2-link');
    const fullTab = document.getElementById('atlas-2way-modal-fulltab-link');

    const sNum = String(item.slideNumber).padStart(2, '0');
    const targetMode = mode || 'edit';
    const studioUrl = `/drawio/${encodeURIComponent(item.diagramId)}?compSlide=${item.slideNumber}&mode=${encodeURIComponent(targetMode)}`;

    if (badge) badge.textContent = `${formatSlideOrExtBadge(item)} • ${item.diagramId}`;
    if (title) title.textContent = item.title;
    if (link1 && item.linkages) link1.href = item.linkages.deck1SlideUrl || 'https://docs.google.com/presentation/d/1erUlsPYIcS7-8GntHaj96nsKLZMJuaIesMPkidQgmTk/edit#slide=id.p1';
    if (link2 && item.linkages) link2.href = item.linkages.deck2SlideUrl || 'https://docs.google.com/presentation/d/111n5JgAss6hr1OjdWNrVSGtflqASC4DecN-M5Bh4OBc/edit#slide=id.p1';
    if (fullTab) fullTab.href = studioUrl;
    if (iframe) iframe.src = studioUrl;
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open');
    }
  };
  window.openAtlasDrawioSyncModal = window.openAtlas2WayStudioModal;

  window.toggleAtlas2WayModalMaximize = function toggleAtlas2WayModalMaximize(forceState) {
    isModalMaximized = typeof forceState === 'boolean' ? forceState : !isModalMaximized;
    const modal = document.getElementById('atlas-drawio-2way-modal');
    const dlg = document.getElementById('atlas-2way-modal-dialog');
    const btn = document.getElementById('atlas-2way-modal-maximize-btn');
    if (modal) {
      modal.style.padding = isModalMaximized ? '0' : '16px';
    }
    if (dlg) {
      if (isModalMaximized) {
        dlg.style.width = '100vw';
        dlg.style.height = '100vh';
        dlg.style.borderRadius = '0';
        dlg.style.border = '0';
      } else {
        dlg.style.width = 'min(94vw, 1440px)';
        dlg.style.height = 'min(88vh, 880px)';
        dlg.style.borderRadius = '12px';
        dlg.style.border = '1.5px solid #cbd5e1';
      }
    }
    if (btn) {
      btn.textContent = isModalMaximized ? '🗗 Restore' : '⛶ Maximize';
      btn.classList.toggle('primary', isModalMaximized);
    }
  };

  window.toggleStudioMaximizeFromIframe = function toggleStudioMaximizeFromIframe(wantMax) {
    const modal = document.getElementById('atlas-drawio-2way-modal');
    if (modal && modal.style.display !== 'none') {
      window.toggleAtlas2WayModalMaximize(wantMax);
      return;
    }
    if (maximizedBlogCardId) {
      window.toggleBlogDiagramCardMaximize(maximizedBlogCardId, wantMax);
      return;
    }
    const activeTab = document.getElementById('tab-diagrams');
    if (activeTab && activeTab.classList.contains('active')) {
      window.toggleAtlasStageMaximize(wantMax);
    }
  };

  window.closeAtlas2WayStudioModal = function closeAtlas2WayStudioModal() {
    const modal = document.getElementById('atlas-drawio-2way-modal');
    const iframe = document.getElementById('atlas-2way-modal-iframe');
    if (iframe) iframe.removeAttribute('src');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
  };
  window.closeAtlasDrawioSyncModal = window.closeAtlas2WayStudioModal;

  // ==========================================================================
  // BLOG BLANK PLACEHOLDER CANVAS & DIAGRAM INSERTION CONTROLLER
  // ==========================================================================

  function getActiveBlogKey() {
    if (typeof activeHubDocPath !== 'undefined' && activeHubDocPath) {
      return activeHubDocPath;
    }
    if (typeof activeHubWsKey !== 'undefined' && activeHubWsKey) {
      return activeHubWsKey;
    }
    return 'WS1';
  }

  function loadStoredBlogDiagrams() {
    try {
      const raw = localStorage.getItem(INSERTED_DIAGRAMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return {};
  }

  function saveStoredBlogDiagrams(mapObj) {
    try {
      localStorage.setItem(INSERTED_DIAGRAMS_STORAGE_KEY, JSON.stringify(mapObj || {}));
    } catch (_) {}
  }

  function buildInsertedDiagramCardInnerHtml(canvasId, item, mode, isMaximized) {
    const diagId = item.diagramId;
    const sNum = String(item.slideNumber).padStart(2, '0');
    const lnk = item.linkages || {};
    const flt = item.filters || {};

    return `
      <div class="card-editable-body" style="display:flex; flex-direction:column; gap:10px; flex:1;">
        <!-- Clean Header Row: Slide Badge + Title + Format Switcher + Maximize/Restore -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; padding-right:${isMaximized ? '0' : '200px'};">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-blue">${escHtml(formatSlideOrExtBadge(item))}</span>
            <strong style="font-size:14px; color:#0f172a;">${escHtml(item.shortTitle || item.title)}</strong>
          </div>
          <div style="display:flex; align-items:center; gap:5px; flex-wrap:wrap;">
            <div style="display:inline-flex; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:2px; gap:2px;">
              <button type="button" class="sim-btn blog-ins-mode-btn ${mode === 'static' ? 'primary' : ''}" data-mode="static" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'static', '${escHtml(canvasId)}')" style="border:0; padding:3px 8px; font-size:10.5px; font-weight:700;">🖼️ Slide</button>
              <button type="button" class="sim-btn blog-ins-mode-btn ${mode === 'animated' ? 'primary' : ''}" data-mode="animated" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'animated', '${escHtml(canvasId)}')" style="border:0; padding:3px 8px; font-size:10.5px; font-weight:700;">🎬 Animated</button>
              <button type="button" class="sim-btn blog-ins-mode-btn ${mode === 'inline-drawio' ? 'primary' : ''}" data-mode="inline-drawio" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'inline-drawio', '${escHtml(canvasId)}')" style="border:0; padding:3px 8px; font-size:10.5px; font-weight:700;">✏️ Draw.io 2-Way</button>
              <button type="button" class="sim-btn blog-ins-mode-btn ${mode === 'svg' ? 'primary' : ''}" data-mode="svg" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'svg', '${escHtml(canvasId)}')" style="border:0; padding:3px 8px; font-size:10.5px; font-weight:700;">📐 SVG</button>
              <button type="button" class="sim-btn blog-ins-mode-btn ${mode === 'side-by-side' ? 'primary' : ''}" data-mode="side-by-side" onclick="setAtlasCardViewMode('${escHtml(diagId)}', 'side-by-side', '${escHtml(canvasId)}')" style="border:0; padding:3px 8px; font-size:10.5px; font-weight:700;">⚡ Compare</button>
            </div>
            <button type="button" class="sim-btn ${isMaximized ? 'primary' : ''}" onclick="toggleBlogDiagramCardMaximize('${escHtml(canvasId)}')" style="padding:4px 9px; font-size:11px; font-weight:800; border-color:#1a73e8; color:${isMaximized ? '#ffffff' : '#1a73e8'};" title="Maximize or Restore Diagram">
              ${isMaximized ? '🗗 Restore' : '⛶ Maximize'}
            </button>
          </div>
        </div>

        <!-- Visual Stage -->
        <div id="blog-ins-stage-${escHtml(canvasId)}" style="flex:1;">
          ${buildVisualStageHtml(item, mode, canvasId, isMaximized)}
        </div>

        <!-- Compact Footer: Purpose + Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-top:6px; border-top:1px solid #f1f5f9; font-size:11.5px; color:#475569;">
          <div style="flex:1; min-width:240px;">
            <strong style="color:#0f172a;">Purpose:</strong> ${escHtml(item.purpose)}
            <span style="margin-left:6px; color:#64748b;">(${escHtml(lnk.hopLayer || '5-Hop')} &bull; ${escHtml(lnk.blockerId || 'All Blockers')})</span>
          </div>
          <div style="display:flex; gap:5px; align-items:center; flex-wrap:wrap;">
            <a href="${escHtml(lnk.deck1SlideUrl || '#')}" target="_blank" rel="noopener noreferrer" class="sim-btn" style="text-decoration:none; padding:3px 8px; font-size:11px; font-weight:700; background:#fffbeb; color:#b45309; border-color:#fde68a;">📊 Slides ↗</a>
            <button type="button" class="sim-btn primary" onclick="openAtlas2WayStudioModal('${escHtml(diagId)}', 'edit')" style="padding:3px 8px; font-size:11px; font-weight:700;">✏️ Draw.io Studio</button>
            <button type="button" class="sim-btn" onclick="reopenPlaceholderPickerForCanvas('${escHtml(canvasId)}')" style="padding:3px 8px; font-size:11px; font-weight:700;">🔄 Change Diagram</button>
          </div>
        </div>
      </div>`;
  }

  function buildBlankPlaceholderPickerHtml(canvasId) {
    const items = getAtlasItems();
    const optionsHtml = items.map(it => {
      const sNum = String(it.slideNumber).padStart(2, '0');
      const prefix = it.inCompendium54 ? `[Slide ${sNum}/38]` : `[Ext #${sNum - 54}]`;
      return `<option value="${escHtml(it.diagramId)}">${escHtml(prefix)} ${escHtml(it.shortTitle || it.title)} (${escHtml(it.diagramId)})</option>`;
    }).join('');

    return `
      <div class="card-editable-body" data-blank-canvas="true" style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-right:195px;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="badge badge-blue">📐 BLANK DIAGRAM PLACEHOLDER CANVAS</span>
            <span style="font-size:12.5px; font-weight:700; color:#0f172a;">Select an Available Diagram to Insert</span>
          </div>
        </div>
        <div style="background:#f8fafc; border:1.5px dashed #93c5fd; border-radius:8px; padding:10px 12px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <select id="picker-ws-${escHtml(canvasId)}" aria-label="Filter diagram category" onchange="filterBlankCanvasPicker('${escHtml(canvasId)}')" style="width:auto; flex:0 0 auto; padding:5px 8px; font-size:11.5px; border:1px solid #cbd5e1; border-radius:6px; background:#ffffff; color:#0f172a; font-weight:600;">
            <option value="ALL">All 67 Available Diagrams</option>
            <option value="ARCH_DIAGRAM">📐 30 Architecture Diagrams</option>
            <option value="OPENING">Opening &amp; Framing (01–07)</option>
            <option value="WS1">WS1: 5-Hop Control Plane (08–14)</option>
            <option value="WS2">WS2: Pattern A Pooled (15–20)</option>
            <option value="WS3">WS3: Pattern B Silo (21–26)</option>
            <option value="WS4">WS4: Pattern C Hybrid (27–30)</option>
            <option value="WS5">WS5: Decision &amp; Multi-Cloud (31–38)</option>
          </select>
          <input type="search" id="picker-search-${escHtml(canvasId)}" aria-label="Filter diagram keyword" oninput="filterBlankCanvasPicker('${escHtml(canvasId)}')" placeholder="Filter keyword or BLK-04..." style="width:165px; flex:0 0 auto; padding:5px 8px; font-size:11.5px; border:1px solid #cbd5e1; border-radius:6px; background:#ffffff; color:#0f172a;" />
          <select id="picker-select-${escHtml(canvasId)}" aria-label="Select diagram to insert" style="width:auto; flex:1 1 260px; min-width:220px; padding:5px 10px; font-size:11.5px; border:1.5px solid #1a73e8; border-radius:6px; background:#ffffff; color:#0f172a; font-weight:700;">
            ${optionsHtml}
          </select>
          <select id="picker-mode-${escHtml(canvasId)}" aria-label="Select initial format" style="width:auto; flex:0 0 auto; padding:5px 8px; font-size:11.5px; border:1px solid #cbd5e1; border-radius:6px; background:#ffffff; color:#0f172a; font-weight:600;">
            <option value="static">🖼️ Slide</option>
            <option value="animated">🎬 Animated</option>
            <option value="inline-drawio">✏️ Draw.io 2-Way</option>
            <option value="svg">📐 SVG</option>
            <option value="side-by-side">⚡ Compare</option>
          </select>
          <button type="button" class="sim-btn primary" onclick="selectDiagramForPlaceholderCanvas('${escHtml(canvasId)}')" style="padding:5px 12px; font-size:11.5px; font-weight:800; flex:0 0 auto;">
            ✅ Insert Diagram
          </button>
        </div>
      </div>`;
  }

  window.filterBlankCanvasPicker = function filterBlankCanvasPicker(canvasId) {
    const wsEl = document.getElementById(`picker-ws-${canvasId}`);
    const qEl = document.getElementById(`picker-search-${canvasId}`);
    const selEl = document.getElementById(`picker-select-${canvasId}`);
    if (!selEl) return;

    const wsVal = wsEl ? wsEl.value : 'ALL';
    const q = qEl ? qEl.value.trim().toLowerCase() : '';
    const items = getAtlasItems().filter(it => {
      const flt = it.filters || {};
      const lnk = it.linkages || {};
      if (wsVal === 'ARCH_DIAGRAM' && flt.slideRole !== 'ARCH_DIAGRAM' && flt.slideRole !== 'ARCHITECTURE_DIAGRAM') return false;
      if (['OPENING', 'WS1', 'WS2', 'WS3', 'WS4', 'WS5'].includes(wsVal) && flt.workstream !== wsVal) return false;
      if (q) {
        const hay = `${it.slideNumber} ${it.diagramId} ${it.title} ${it.purpose} ${lnk.blockerId || ''} ${lnk.hopLayer || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    selEl.innerHTML = items.map(it => {
      const sNum = String(it.slideNumber).padStart(2, '0');
      const prefix = it.inCompendium54 ? `[Slide ${sNum}/38]` : `[Ext #${sNum - 54}]`;
      return `<option value="${escHtml(it.diagramId)}">${escHtml(prefix)} ${escHtml(it.shortTitle || it.title)} (${escHtml(it.diagramId)})</option>`;
    }).join('');
  };

  window.insertBlankDiagramCanvasInBlog = function insertBlankDiagramCanvasInBlog(afterCardId, initialDiagramId, initialDisplayMode) {
    const reader = document.getElementById('hub-blog-reader');
    if (!reader) return null;

    const canvasId = `blog-ins-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const wrapper = document.createElement('section');
    wrapper.id = canvasId;
    wrapper.className = 'card doc-section-card blog-blank-diagram-canvas';
    wrapper.setAttribute('data-card-id', canvasId);
    wrapper.setAttribute('data-card-type', 'blog_diagram_canvas');
    wrapper.setAttribute('data-blank-canvas', initialDiagramId ? 'false' : 'true');
    wrapper.style.cssText = 'border:1.5px solid #cbd5e1; background:#ffffff; border-radius:10px; padding:14px 16px; margin:14px 0; position:relative; box-shadow:0 2px 8px rgba(15,23,42,0.04);';

    if (initialDiagramId) {
      const item = getDiagramById(initialDiagramId) || getAtlasItems()[0];
      if (item) {
        const chosenMode = initialDisplayMode || 'static';
        cardViewModes[item.diagramId] = chosenMode;
        wrapper.className = 'card doc-section-card blog-inserted-diagram-card';
        wrapper.setAttribute('data-card-title', item.title);
        wrapper.setAttribute('data-diagram-id', item.diagramId);
        wrapper.innerHTML = buildInsertedDiagramCardInnerHtml(canvasId, item, chosenMode, false);
        persistInsertedBlogDiagram(canvasId, item.diagramId, chosenMode, afterCardId || '');
      } else {
        wrapper.setAttribute('data-card-title', 'Blank Diagram Placeholder Canvas');
        wrapper.innerHTML = buildBlankPlaceholderPickerHtml(canvasId);
      }
    } else {
      wrapper.setAttribute('data-card-title', 'Blank Diagram Placeholder Canvas');
      wrapper.innerHTML = buildBlankPlaceholderPickerHtml(canvasId);
    }

    const afterEl = afterCardId ? (document.querySelector(`[data-card-id="${afterCardId}"]`) || document.getElementById(afterCardId)) : null;
    if (afterEl && afterEl.parentNode) {
      afterEl.parentNode.insertBefore(wrapper, afterEl.nextSibling);
    } else {
      const firstSection = reader.querySelector('.doc-section-card, .gcp-exec-summary-card');
      if (firstSection && firstSection.parentNode) {
        firstSection.parentNode.insertBefore(wrapper, firstSection.nextSibling);
      } else {
        reader.prepend(wrapper);
      }
    }

    activePlaceholderCanvasId = canvasId;
    if (typeof window.initAllPortalCardHoverToolbars === 'function') {
      window.initAllPortalCardHoverToolbars();
    }
    try {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {}

    if (initialDiagramId) {
      persistInsertedBlogDiagram(canvasId, initialDiagramId, initialDisplayMode || 'static', afterCardId || '');
    } else if (typeof window.showPortalToast === 'function') {
      window.showPortalToast('📐 Blank Diagram Canvas Added', 'Choose any diagram from the dropdown to embed it inline.');
    }
    return canvasId;
  };

  function persistInsertedBlogDiagram(canvasId, diagId, displayMode, afterCardId) {
    const blogKey = getActiveBlogKey();
    const store = loadStoredBlogDiagrams();
    if (!Array.isArray(store[blogKey])) store[blogKey] = [];
    const existingIdx = store[blogKey].findIndex(x => x.canvasId === canvasId);
    const entry = {
      canvasId,
      diagramId: diagId,
      displayMode: displayMode || 'static',
      afterCardId: afterCardId || '',
      updatedAt: new Date().toISOString()
    };
    if (existingIdx !== -1) {
      store[blogKey][existingIdx] = entry;
    } else {
      store[blogKey].push(entry);
    }
    saveStoredBlogDiagrams(store);

    const item = getDiagramById(diagId);
    fetch('/api/blog-cards/mutate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'INSERT_DIAGRAM',
        targetType: 'blog_diagram_canvas',
        cardId: canvasId,
        cardTitle: item ? item.title : diagId,
        workstream: typeof activeHubWsKey !== 'undefined' ? activeHubWsKey : 'WS1',
        docPath: blogKey,
        summary: `Inserted diagram '${item ? item.title : diagId}' (${displayMode || 'static'}) into ${blogKey}.`
      })
    }).catch(() => {});
  }

  window.selectDiagramForPlaceholderCanvas = function selectDiagramForPlaceholderCanvas(canvasId, explicitDiagramId, explicitMode) {
    const cardEl = document.getElementById(canvasId) || document.querySelector(`[data-card-id="${canvasId}"]`);
    if (!cardEl) return;
    const selEl = document.getElementById(`picker-select-${canvasId}`);
    const modeEl = document.getElementById(`picker-mode-${canvasId}`);
    const chosenId = explicitDiagramId || (selEl ? selEl.value : 'ws1-cloud-arch-center-5hop-baseline');
    const chosenMode = explicitMode || (modeEl ? modeEl.value : 'static');
    const item = getDiagramById(chosenId);
    if (!item) return;

    cardViewModes[chosenId] = chosenMode;
    cardEl.className = 'card doc-section-card blog-inserted-diagram-card';
    cardEl.setAttribute('data-blank-canvas', 'false');
    cardEl.setAttribute('data-card-title', item.title);
    cardEl.setAttribute('data-diagram-id', item.diagramId);
    cardEl.innerHTML = buildInsertedDiagramCardInnerHtml(canvasId, item, chosenMode, maximizedBlogCardId === canvasId);

    if (typeof window.initAllPortalCardHoverToolbars === 'function') {
      window.initAllPortalCardHoverToolbars();
    }
    persistInsertedBlogDiagram(canvasId, item.diagramId, chosenMode, '');
    if (typeof window.showPortalToast === 'function') {
      window.showPortalToast('✅ Diagram Inserted in Blog', `Embedded "${item.shortTitle || item.title}".`);
    }
  };
  window.confirmBlankCanvasSelection = window.selectDiagramForPlaceholderCanvas;

  window.reopenPlaceholderPickerForCanvas = function reopenPlaceholderPickerForCanvas(canvasId) {
    const cardEl = document.getElementById(canvasId) || document.querySelector(`[data-card-id="${canvasId}"]`);
    if (!cardEl) return;
    cardEl.className = 'card doc-section-card blog-blank-diagram-canvas';
    cardEl.setAttribute('data-blank-canvas', 'true');
    cardEl.innerHTML = buildBlankPlaceholderPickerHtml(canvasId);
    if (typeof window.initAllPortalCardHoverToolbars === 'function') {
      window.initAllPortalCardHoverToolbars();
    }
  };

  window.restoreSavedBlogInsertedDiagrams = function restoreSavedBlogInsertedDiagrams() {
    const reader = document.getElementById('hub-blog-reader');
    if (!reader) return;

    if (!document.getElementById('blog-bottom-insert-canvas-bar')) {
      const bottomBar = document.createElement('div');
      bottomBar.id = 'blog-bottom-insert-canvas-bar';
      bottomBar.style.cssText = 'margin:16px 0; padding:10px 14px; background:#f8fafc; border:1px dashed #93c5fd; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;';
      bottomBar.innerHTML = `
        <span style="font-size:12px; color:#334155; font-weight:600;">📐 Insert a Blank Diagram Placeholder Canvas and select from 38 Architecture Slides or 28 Extended Blueprints:</span>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="sim-btn primary" onclick="insertBlankDiagramCanvasInBlog()" style="font-size:11.5px; font-weight:700; padding:5px 11px;">➕ Insert Blank Diagram Canvas</button>
          <button type="button" class="sim-btn" onclick="switchTab('diagrams', document.getElementById('tab-btn-diagrams'))" style="font-size:11.5px; font-weight:600; padding:5px 11px;">📐 Open Slide Diagrams Atlas &rarr;</button>
        </div>`;
      reader.appendChild(bottomBar);
    }

    const blogKey = getActiveBlogKey();
    const store = loadStoredBlogDiagrams();
    const savedList = store[blogKey] || [];
    savedList.forEach(entry => {
      if (!entry || !entry.canvasId || !entry.diagramId) return;
      if (document.getElementById(entry.canvasId)) return;
      const item = getDiagramById(entry.diagramId);
      if (!item) return;
      const wrapper = document.createElement('section');
      wrapper.id = entry.canvasId;
      wrapper.className = 'card doc-section-card blog-inserted-diagram-card';
      wrapper.setAttribute('data-card-id', entry.canvasId);
      wrapper.setAttribute('data-card-type', 'blog_diagram_canvas');
      wrapper.setAttribute('data-blank-canvas', 'false');
      wrapper.setAttribute('data-card-title', item.title);
      wrapper.setAttribute('data-diagram-id', item.diagramId);
      wrapper.style.cssText = 'border:1.5px solid #cbd5e1; background:#ffffff; border-radius:10px; padding:14px 16px; margin:14px 0; position:relative; box-shadow:0 2px 8px rgba(15,23,42,0.04);';
      wrapper.innerHTML = buildInsertedDiagramCardInnerHtml(entry.canvasId, item, entry.displayMode || 'static', false);
      const firstSection = reader.querySelector('.doc-section-card, .gcp-exec-summary-card');
      if (firstSection && firstSection.parentNode) {
        firstSection.parentNode.insertBefore(wrapper, firstSection.nextSibling);
      } else {
        reader.prepend(wrapper);
      }
    });
    if (typeof window.initAllPortalCardHoverToolbars === 'function') {
      window.initAllPortalCardHoverToolbars();
    }
  };

  window.openBlogWithNewBlankCanvas = function openBlogWithNewBlankCanvas() {
    const tabBtn = document.getElementById('tab-btn-patterns');
    if (typeof window.switchTab === 'function') {
      window.switchTab('patterns', tabBtn);
    }
    setTimeout(() => {
      window.insertBlankDiagramCanvasInBlog();
    }, 120);
  };

  window.promptInsertDiagramIntoBlog = function promptInsertDiagramIntoBlog(diagId) {
    const item = getDiagramById(diagId);
    if (!item) return;
    pendingInsertDiagramId = item.diagramId;

    const modal = document.getElementById('atlas-insert-blog-modal');
    const badgeEl = document.getElementById('atlas-insert-selected-diag-badge');
    const titleEl = document.getElementById('atlas-insert-selected-diag-title');
    const purposeEl = document.getElementById('atlas-insert-selected-diag-purpose');
    const wsSel = document.getElementById('atlas-insert-target-ws');

    if (badgeEl) badgeEl.textContent = `${formatSlideOrExtBadge(item)} • ${item.diagramId}`;
    if (titleEl) titleEl.textContent = item.title;
    if (purposeEl) purposeEl.textContent = item.purpose;
    if (wsSel && item.linkages && item.linkages.workstream) {
      wsSel.value = item.linkages.workstream;
    }
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open');
    }
  };

  window.closeAtlasInsertBlogModal = function closeAtlasInsertBlogModal() {
    const modal = document.getElementById('atlas-insert-blog-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
  };

  window.confirmInsertDiagramIntoBlogFromModal = function confirmInsertDiagramIntoBlogFromModal() {
    const diagId = pendingInsertDiagramId;
    if (!diagId) return;
    const wsSel = document.getElementById('atlas-insert-target-ws');
    const modeSel = document.getElementById('atlas-insert-display-mode');
    const targetWs = wsSel ? wsSel.value : 'CURRENT';
    const displayMode = modeSel ? modeSel.value : 'static';

    window.closeAtlasInsertBlogModal();
    if (isAtlasStageMaximized) {
      isAtlasStageMaximized = false;
    }
    const tabBtn = document.getElementById('tab-btn-patterns');
    if (typeof window.switchTab === 'function') {
      window.switchTab('patterns', tabBtn);
    }
    if (targetWs !== 'CURRENT' && typeof window.selectGuidedWorkstream === 'function') {
      window.selectGuidedWorkstream(targetWs);
    }
    setTimeout(() => {
      const existingBlank = document.querySelector('#hub-blog-reader .blog-blank-diagram-canvas[data-blank-canvas="true"]');
      if (existingBlank && existingBlank.id) {
        window.selectDiagramForPlaceholderCanvas(existingBlank.id, diagId, displayMode);
      } else {
        window.insertBlankDiagramCanvasInBlog(null, diagId, displayMode);
      }
    }, 180);
  };

  // Keyboard navigation: Left/Right arrows for One-Slide-at-a-Time, Escape to restore maximized view
  document.addEventListener('keydown', function (ev) {
    const tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toLowerCase() : '';
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || (ev.target && ev.target.isContentEditable);
    if (ev.key === 'Escape') {
      if (isModalMaximized) {
        window.toggleAtlas2WayModalMaximize(false);
        return;
      }
      if (isAtlasStageMaximized) {
        window.toggleAtlasStageMaximize(false);
        return;
      }
      if (maximizedBlogCardId) {
        if (maximizedBlogCardId.startsWith('blog-ins-')) {
          window.toggleBlogDiagramCardMaximize(maximizedBlogCardId, false);
        } else {
          window.toggleGenericDiagramCardMaximize(maximizedBlogCardId, null, false);
        }
        return;
      }
    }
    if (isInput) return;
    const tabDiagrams = document.getElementById('tab-diagrams');
    if (tabDiagrams && tabDiagrams.classList.contains('active')) {
      if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        window.prevAtlasSlide();
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        window.nextAtlasSlide();
      }
    }
  });

  function applyInitialSlideSelectionFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const pathTarget = (pathParts[0] === 'slide-diagrams' || pathParts[0] === 'diagrams-atlas') && pathParts[1]
        ? decodeURIComponent(pathParts[1])
        : (window.__INITIAL_ATLAS_SLIDE_TARGET || '');
      const slideParam = params.get('slide') || params.get('compSlide') || pathTarget;
      const diagParam = params.get('diagram') || params.get('id') || pathTarget;
      const modeParam = params.get('mode') || '';

      const allItems = getAtlasItems();
      let matchedItem = null;

      if (slideParam && /^\d+$/.test(String(slideParam).replace(/^slide-?/i, ''))) {
        const sNum = parseInt(String(slideParam).replace(/^slide-?/i, ''), 10);
        matchedItem = allItems.find(it => Number(it.slideNumber) === sNum) || null;
      }
      if (!matchedItem && diagParam) {
        const cleanDiag = String(diagParam).trim().toLowerCase();
        matchedItem = allItems.find(it => String(it.diagramId || '').toLowerCase() === cleanDiag) || null;
      }

      if (matchedItem) {
        if (!matchedItem.inCompendium54 && Number(matchedItem.slideNumber) > 54) {
          atlasScopeFilter = 'ALL_82';
          const scopeEl = document.getElementById('atlas-filter-scope');
          if (scopeEl) scopeEl.value = 'ALL_82';
        }
        if (modeParam && ['static', 'animated', 'inline-drawio', 'svg', 'side-by-side'].includes(modeParam)) {
          cardViewModes[matchedItem.diagramId] = modeParam;
        }
        const filtered = filterAtlasItemsList();
        const foundIdx = filtered.findIndex(it => it.diagramId === matchedItem.diagramId && it.slideNumber === matchedItem.slideNumber);
        if (foundIdx >= 0) {
          activeSlideIndex = foundIdx;
        }
      }
    } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyInitialSlideSelectionFromUrl();
    renderDiagramsAtlasGrid();
    const params = new URLSearchParams(window.location.search);
    if (
      window.__STANDALONE_DIAGRAMS_PAGE ||
      window.location.pathname.startsWith('/diagrams-atlas') ||
      window.location.pathname.startsWith('/slide-diagrams') ||
      params.get('slide') ||
      params.get('diagram')
    ) {
      const btn = document.getElementById('tab-btn-diagrams');
      if (typeof window.switchTab === 'function') {
        window.switchTab('diagrams', btn, true);
      }
    }
  });
})();
