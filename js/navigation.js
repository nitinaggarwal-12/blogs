// ==========================================================================
// js/navigation.js — History Deep-Linking (?tab=&ws=&doc=) & Tab Orchestration
// ==========================================================================

    let currentRawMarkdown = '';

    function getActivePortalTabName() {
      const activePane = document.querySelector('.tab-pane.active');
      if (activePane && activePane.id && activePane.id.startsWith('tab-')) {
        return activePane.id.replace(/^tab-/, '');
      }
      const activeBtn = document.querySelector('.tab-btn.active');
      if (activeBtn && activeBtn.id && activeBtn.id.startsWith('tab-btn-')) {
        return activeBtn.id.replace(/^tab-btn-/, '');
      }
      return 'overview';
    }
    window.getActivePortalTabName = getActivePortalTabName;

    function syncPortalUrl(opts = {}) {
      try {
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);

        // Determine active tab
        const tab = opts.tab || getActivePortalTabName() || 'overview';
        if (tab && tab !== 'overview') {
          params.set('tab', tab);
        } else {
          params.set('tab', 'overview');
        }

        // Tab 1 Patterns: sync ?tab=patterns&ws=...&doc=...
        if (tab === 'patterns') {
          const ws = opts.ws || (typeof activeHubWsKey !== 'undefined' ? activeHubWsKey : 'WS1');
          if (ws) params.set('ws', ws);
          if (opts.doc) {
            params.set('doc', opts.doc);
          } else {
            params.delete('doc');
          }
          params.delete('wb');
        } else {
          // When not on patterns tab, remove ws and doc unless keepWsDoc is requested
          if (!opts.keepWsDoc) {
            params.delete('ws');
            params.delete('doc');
          }
        }

        // Tab 3 Screenshots / Workbench: sync ?tab=screenshots&wb=...
        if (tab === 'screenshots') {
          if (opts.wb) {
            params.set('wb', opts.wb);
          }
        } else {
          params.delete('wb');
        }

        const newQuery = params.toString() ? ('?' + params.toString()) : '';
        let newHash = '';
        if (opts.hash !== undefined) {
          newHash = opts.hash ? ('#' + String(opts.hash).replace(/^#/, '')) : '';
        } else {
          newHash = currentUrl.hash || '';
        }

        const targetUrl = currentUrl.pathname + newQuery + newHash;
        const currentFullUrl = window.location.pathname + window.location.search + window.location.hash;

        const stateObj = {
          tab: tab,
          ws: (tab === 'patterns') ? (params.get('ws') || null) : null,
          doc: (tab === 'patterns') ? (params.get('doc') || null) : null,
          wb: (tab === 'screenshots') ? (params.get('wb') || null) : null
        };

        if (targetUrl !== currentFullUrl) {
          if (opts.replace) {
            history.replaceState(stateObj, '', targetUrl);
          } else {
            history.pushState(stateObj, '', targetUrl);
          }
        }
      } catch (err) {
        console.warn('[syncPortalUrl] Failed to sync URL state:', err);
      }
    }
    window.syncPortalUrl = syncPortalUrl;

    function switchTab(name, btn, skipHistoryPush) {
      if (typeof btn === 'boolean' && skipHistoryPush === undefined) {
        skipHistoryPush = btn;
        btn = null;
      }
      try {
        if (typeof trackClickstream === 'function') {
          trackClickstream('TAB_SWITCH', 'tab-' + name, 'Switched to tab: ' + name);
        }
      } catch (_) {}
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
        el.setAttribute('aria-selected', 'false');
      });
      const pane = document.getElementById('tab-' + name);
      if (pane) pane.classList.add('active');
      if (btn && btn.classList) {
        btn.classList.add('active');
        if (btn.hasAttribute('aria-selected')) btn.setAttribute('aria-selected', 'true');
      } else {
        const defaultBtn = document.getElementById('tab-btn-' + name);
        if (defaultBtn) {
          defaultBtn.classList.add('active');
          if (defaultBtn.hasAttribute('aria-selected')) defaultBtn.setAttribute('aria-selected', 'true');
        }
      }
      const govSel = document.getElementById('header-governance-select');
      if (govSel) {
        govSel.value = (name === 'forensic' || name === 'changelog') ? name : '';
      }
      if (name === 'simulator' && !window.__simInitialRunDone) {
        window.__simInitialRunDone = true;
        runLiveScenario('sim1');
      }
      if (name === 'changelog' && typeof renderChangeLogTable === 'function') {
        renderChangeLogTable();
      }

      // Smooth scroll to top on tab transitions ([FA-06])
      try {
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, left: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      } catch (_) {
        window.scrollTo(0, 0);
      }

      // Sync URL query params via history.pushState ([FA-06])
      if (!skipHistoryPush) {
        syncPortalUrl({
          tab: name,
          ws: (name === 'patterns') ? (typeof activeHubWsKey !== 'undefined' ? activeHubWsKey : 'WS1') : null,
          doc: (name === 'patterns') ? (typeof activeHubDocPath !== 'undefined' ? activeHubDocPath : null) : null
        });
      }
    }
    window.switchTab = switchTab;

    // Browser History popstate Listener ([FA-06])
    window.addEventListener('popstate', function (event) {
      try {
        const params = new URLSearchParams(window.location.search);
        const state = event.state || {};
        const tab = state.tab || params.get('tab') || 'overview';
        const ws = state.ws || params.get('ws');
        const doc = state.doc || params.get('doc');
        const wb = state.wb || params.get('wb');
        const page = params.get('page');
        const hash = window.location.hash ? window.location.hash.slice(1) : '';

        // Switch to the target tab without pushing duplicate history
        const tabBtn = document.getElementById('tab-btn-' + tab);
        switchTab(tab, tabBtn, true);

        // If on patterns tab, restore workstream and/or doc
        if (tab === 'patterns') {
          if (doc && typeof openDocInReader === 'function') {
            openDocInReader(doc, hash, true);
          } else if (ws && typeof GUIDED_WORKSTREAMS !== 'undefined' && GUIDED_WORKSTREAMS[ws] && typeof selectGuidedWorkstream === 'function') {
            selectGuidedWorkstream(ws, null, hash, true);
          } else if (typeof activeHubWsKey !== 'undefined' && typeof selectGuidedWorkstream === 'function') {
            selectGuidedWorkstream(activeHubWsKey, null, hash, true);
          }
        }

        // If on screenshots tab and workbench subtab specified
        if (tab === 'screenshots' && wb && typeof switchE2EWorkbenchTab === 'function') {
          switchE2EWorkbenchTab(wb);
        }

        // If on overview tab and one-pager page specified
        if (tab === 'overview' && page && typeof window.filterOverviewOnePager === 'function') {
          window.filterOverviewOnePager(page, null, true);
        }

        // Anchor scroll if hash exists
        if (hash) {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      } catch (err) {
        console.warn('[popstate] Failed to restore history state:', err);
      }
    });

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function resolveRelativeAssetUrl(href, docRelPath) {
      if (!href || href.startsWith('#') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('file://') || href.startsWith('/')) {
        return href;
      }
      if (!docRelPath || !docRelPath.includes('/')) {
        return href;
      }
      const dir = docRelPath.slice(0, docRelPath.lastIndexOf('/'));
      return `${dir}/${href}`;
    }

    function openWorkbenchView(wbTab, subTarget) {
      const cleanTab = ['execution', 'resources', 'codebase', 'runbook', 'deliverables'].includes(wbTab) ? wbTab : 'codebase';
      switchTab('screenshots', document.getElementById('tab-btn-screenshots'));
      switchE2EWorkbenchTab(cleanTab);
      try {
        history.replaceState(null, '', `/?tab=screenshots&wb=${encodeURIComponent(cleanTab)}`);
      } catch (_) {}
      setTimeout(() => {
        if (subTarget === 'terraform') {
          const tfHub = document.getElementById('terraform-1click-deployment-hub');
          if (tfHub) {
            tfHub.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
        const wbEl = document.getElementById('blog-e2e-pattern-execution-and-codebase-workbench');
        if (wbEl) wbEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
    window.openWorkbenchView = openWorkbenchView;

    function openCodeOrArtifactInWorkbench(repoRelPath) {
      let clean = normalizeRepoPath(String(repoRelPath || '').replace(/\/+$/, ''));
      if (clean.endsWith('2.6-terraform-starter') || clean.endsWith('3.6-terraform-silo-blueprint') || clean.endsWith('4.6-terraform-hybrid-psc-blueprint')) {
        clean = clean + '/main.tf';
      }
      if (e2eBundleData && Array.isArray(e2eBundleData.codebaseFiles)) {
        const idx = e2eBundleData.codebaseFiles.findIndex(f => f.path === clean);
        if (idx !== -1) {
          e2eActiveCategory = 'ALL';
          e2eActiveFileIdx = idx;
          renderE2ECodebaseExplorer();
          openWorkbenchView('codebase');
          return;
        }
      }
      viewArtifact(clean);
    }
    window.openCodeOrArtifactInWorkbench = openCodeOrArtifactInWorkbench;

    function scrollToReaderAnchor(rawAnchor) {
      const anchor = decodeURIComponent(String(rawAnchor || '').replace(/^#/, '')).trim();
      if (!anchor) return;
      if (anchor === 'blog-e2e-pattern-execution-and-codebase-workbench') {
        openWorkbenchView('codebase');
        return;
      }
      const readerEl = document.getElementById('hub-blog-reader');
      const root = readerEl || document;
      const collapsed = anchor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let target = document.getElementById(anchor)
        || document.getElementById('h-' + collapsed)
        || (typeof CSS !== 'undefined' && CSS.escape ? root.querySelector(`[data-slug="${CSS.escape(anchor)}"]`) : null)
        || (typeof CSS !== 'undefined' && CSS.escape ? root.querySelector(`[data-collapsed-slug="${CSS.escape(collapsed)}"]`) : null);
      if (!target) {
        const allHeadings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5'));
        target = allHeadings.find(h => {
          const ds = h.getAttribute('data-collapsed-slug') || '';
          return ds === collapsed || (collapsed.length >= 6 && (ds.startsWith(collapsed) || collapsed.startsWith(ds)));
        });
      }
      if (target) {
        const parentTab = target.closest('.tab-pane');
        if (parentTab && parentTab.id && parentTab.style.display === 'none') {
          const tabId = parentTab.id.replace(/^tab-/, '');
          switchTab(tabId, document.getElementById('tab-btn-' + tabId));
        }
        let cur = target.parentElement;
        while (cur) {
          if (cur.tagName === 'DETAILS') cur.open = true;
          cur = cur.parentElement;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try {
          const u = new URL(window.location.href);
          u.hash = '#' + anchor;
          history.replaceState(null, '', u.pathname + u.search + u.hash);
        } catch (_) {}
      }
    }
    window.scrollToReaderAnchor = scrollToReaderAnchor;

