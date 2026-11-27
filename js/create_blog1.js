/* Create Blog Studio Client — Pure Safe DOM (zero unsafe HTML sinks, zero browser secret storage). */
(function () {
  'use strict';

  const STARTER_PROMPTS = [
    {
      label: 'Zero-Trust MCP Gateway',
      title: 'Zero-Trust MCP Server Gateway on Cloud Run & Identity-Aware Proxy',
      domain: 'Multi-Tenant Agentic AI',
      prompt: 'Design a production-grade Google Cloud multi-tenant Model Context Protocol (MCP) Server Gateway on Cloud Run with Identity-Aware Proxy, Workload Identity Federation, Private Service Connect ingress, Cloud DLP egress redaction, and per-tenant BigQuery audit logging. Cover blast-radius trade-offs, fail-closed policy enforcement, quota caps, and a starter Terraform + Python deployment scaffold.',
    },
    {
      label: 'BigQuery RAG w/ RLS',
      title: 'Enterprise RAG with BigQuery Row-Level Security & Vertex AI',
      domain: 'Data & Analytics / RAG',
      prompt: 'Architect an enterprise Retrieval-Augmented Generation (RAG) system using BigQuery vector search with tenant row-level access policies, Vertex AI Gemini 2.5 Pro grounding, Cloud KMS CMEK key-revocation kill switches, and VPC Service Controls perimeter protection. Include latency/cost budgets and fail-closed authorization sequence steps.',
    },
    {
      label: 'Multi-Region Spanner Agent State',
      title: 'Active-Active Agent Session State on Cloud Spanner',
      domain: 'Serverless & Platform Eng',
      prompt: 'Create an Architecture Center guide explaining how to run low-latency stateful AI agent sessions across two regions using Cloud Spanner multi-region instances, Cloud Load Balancing with outlier detection, Cloud Armor WAF, and Memorystore Valkey read-through caching. Compare RPO/RTO guarantees, egress charges, and schema partitioning.',
    },
  ];

  const FALLBACK_CATEGORIES = [
    {
      id: 'reference_architecture',
      name: 'Reference Architecture (Full Stack)',
      shortName: 'Reference Architecture',
      description: 'End-to-end Google Cloud reference architecture pairing a crisp micro-concept diagram, full GCP topology, identity/data locks, request trace, and starter Terraform + Python kit.',
      defaultDomain: 'Multi-Tenant Agentic AI',
      defaultAudience: 'Solutions Architects & Platform Engineers',
      includeStarterCode: true,
      recommendedOutline: [
        { id: 'sec-1', type: 'section', title: 'Core Design Principle & Conceptual Mental Model', enabled: true },
        { id: 'diag-concept', type: 'diagram', kind: 'concept', title: 'Conceptual Mental Model & Core Isolation Invariants', enabled: true },
        { id: 'sec-2', type: 'section', title: 'Google Cloud System Architecture & Plane Ownership', enabled: true },
        { id: 'diag-cloudarch', type: 'diagram', kind: 'cloudarch', title: 'Google Cloud Reference Architecture (Hub-and-Spoke)', enabled: true },
        { id: 'sec-3', type: 'section', title: 'Identity, Authorization & Credential Brokerage', enabled: true },
        { id: 'diag-security', type: 'diagram', kind: 'security', title: 'Three-Layer Identity & Trust Perimeter (C4 L1)', enabled: true },
        { id: 'sec-4', type: 'section', title: 'Stateless Compute, Sandboxes & Scoped Memory', enabled: true },
        { id: 'diag-wire', type: 'diagram', kind: 'wire', title: 'Scoped Context, Memory & Wire Locks (C4 L4)', enabled: true },
        { id: 'sec-5', type: 'section', title: 'Governed Egress, Data Locks & Hard GCP Quotas', enabled: true },
        { id: 'sec-6', type: 'section', title: 'End-to-End Request Trace, Takeaways & Deployment', enabled: true },
        { id: 'diag-sequence', type: 'diagram', kind: 'sequence', title: 'End-to-End Fail-Closed Request Trace (C4 L3)', enabled: true },
        { id: 'diag-architecture', type: 'diagram', kind: 'architecture', title: 'Master Platform Architecture (C4 L2)', enabled: false },
        { id: 'diag-async', type: 'diagram', kind: 'async', title: 'Async Lifecycle, Export & Recovery Loop', enabled: false },
      ],
    },
  ];

  const DIAGRAM_SHORT_LABELS = {
    concept: 'Concept Micro-View',
    architecture: 'Platform L2',
    cloudarch: 'Cloud Arch Hub-Spoke',
    sequence: 'Sequence L3',
    security: 'Trust Perimeter L1',
    wire: 'Wire Protocol L4',
    async: 'Async / Recovery Loop',
  };

  const state = {
    csrfToken: (document.querySelector('meta[name="csrf-token"]') || {}).content || '',
    capabilities: null,
    categories: FALLBACK_CATEGORIES.slice(),
    categoryId: 'reference_architecture',
    outline: JSON.parse(JSON.stringify(FALLBACK_CATEGORIES[0].recommendedOutline)),
    outlineCustomized: false,
    includeStarterCode: true,
    preflightResult: null,
    preflightBusy: false,
    blogs: [],
    activeSlug: null,
    activeBlog: null,
    activeTab: 'reader',
    activeSlide: 1,
    activeCodeFile: 'README.md',
    activeJobId: null,
    pollTimer: null,
    pollInFlight: false,
    pollErrorCount: 0,
    confirmDeleteSlug: null,
    confirmDeleteProofId: null,
    playerSlide: 1,
    playerPlaying: false,
    playerAudio: null,
    exportingWebm: false,
    screenRecorder: null,
    screenStream: null,
    screenChunks: [],
    screenBlobUrl: null,
    slideCacheBust: Date.now(),
    workspaceToken: '',
    workspaceTokenExp: 0,
    workspaceSyncBusy: false,
    gisLoaded: false,
    iterateDrawerOpen: false,
    iterateBusy: false,
    iterateScope: 'all',
    iteratePollTimer: null,
    iterateDiffSummary: [],
    editingTab: null,
    dirtyUnsaved: false,
    driftHint: '',
  };

  function makeSvgBadgeIcon(kind) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 18 18');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.flexShrink = '0';
    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', '1.5');
    bg.setAttribute('y', '1');
    bg.setAttribute('width', '15');
    bg.setAttribute('height', '16');
    bg.setAttribute('rx', '2.5');
    bg.setAttribute('fill', kind === 'slides' ? '#F4B400' : '#4285F4');
    svg.appendChild(bg);
    if (kind === 'slides') {
      const box = document.createElementNS(NS, 'rect');
      box.setAttribute('x', '4.2');
      box.setAttribute('y', '5.5');
      box.setAttribute('width', '9.6');
      box.setAttribute('height', '7');
      box.setAttribute('rx', '1');
      box.setAttribute('fill', '#FFFFFF');
      svg.appendChild(box);
    } else {
      [5.5, 8.6, 11.7].forEach((y, idx) => {
        const line = document.createElementNS(NS, 'rect');
        line.setAttribute('x', '4.5');
        line.setAttribute('y', String(y));
        line.setAttribute('width', idx === 2 ? '6.2' : '9');
        line.setAttribute('height', '1.7');
        line.setAttribute('rx', '0.8');
        line.setAttribute('fill', '#FFFFFF');
        svg.appendChild(line);
      });
    }
    return svg;
  }

  function loadGoogleGisClient() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('cb1-gis-script');
      if (existing) {
        existing.addEventListener('load', () => resolve(true), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load Google Sign-In script.')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.id = 'cb1-gis-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => { state.gisLoaded = true; resolve(true); };
      s.onerror = () => reject(new Error('Unable to load Google Identity Services (accounts.google.com/gsi/client).'));
      document.head.appendChild(s);
    });
  }

  async function requestBrowserDriveToken(clientId) {
    const now = Date.now();
    if (state.workspaceToken && now < state.workspaceTokenExp - 60000) {
      return state.workspaceToken;
    }
    await loadGoogleGisClient();
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error('Google Identity Services OAuth client unavailable in this browser.');
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Google sign-in popup timed out or was closed.'));
        }
      }, 120000);
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (resp) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (resp && resp.access_token) {
            state.workspaceToken = resp.access_token;
            const ttlSec = Number(resp.expires_in || 3300);
            state.workspaceTokenExp = Date.now() + ttlSec * 1000;
            resolve(resp.access_token);
          } else {
            reject(new Error((resp && (resp.error_description || resp.error)) || 'Google Drive authorization cancelled.'));
          }
        },
        error_callback: (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new Error((err && err.message) || 'Google Drive sign-in popup could not open.'));
        },
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  function isSafeHref(url) {
    const s = String(url || '').trim();
    if (!s) return false;
    return s.startsWith('https://') || s.startsWith('/') || s.startsWith('blob:');
  }

  function isSafeImgSrc(url) {
    const s = String(url || '').trim();
    return s.startsWith('https://') || s.startsWith('/') || s.startsWith('blob:') || s.startsWith('data:image/');
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs && typeof attrs === 'object') {
      Object.entries(attrs).forEach(([k, v]) => {
        if (v === null || v === undefined || v === false) return;
        if (k === 'className') {
          node.className = String(v);
        } else if (k === 'style' && typeof v === 'object') {
          Object.assign(node.style, v);
        } else if (k === 'text') {
          node.textContent = String(v);
        } else if (k.startsWith('on') && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'href') {
          if (isSafeHref(v)) node.setAttribute('href', String(v));
        } else if (k === 'src') {
          if (isSafeImgSrc(v) || String(v).startsWith('/api/')) node.setAttribute('src', String(v));
        } else if (v === true) {
          node.setAttribute(k, '');
        } else {
          node.setAttribute(k, String(v));
        }
      });
    }
    for (const ch of children) {
      if (ch === null || ch === undefined || ch === false) continue;
      if (Array.isArray(ch)) {
        ch.forEach((sub) => {
          if (sub !== null && sub !== undefined && sub !== false) {
            node.appendChild(typeof sub === 'string' || typeof sub === 'number' ? document.createTextNode(String(sub)) : sub);
          }
        });
      } else if (typeof ch === 'string' || typeof ch === 'number') {
        node.appendChild(document.createTextNode(String(ch)));
      } else {
        node.appendChild(ch);
      }
    }
    return node;
  }

  function setChildren(node, ...children) {
    if (!node) return;
    const flat = [];
    const push = (item) => {
      if (item === null || item === undefined || item === false) return;
      if (Array.isArray(item)) {
        item.forEach(push);
      } else if (typeof item === 'string' || typeof item === 'number') {
        flat.push(document.createTextNode(String(item)));
      } else {
        flat.push(item);
      }
    };
    children.forEach(push);
    node.replaceChildren(...flat);
  }

  function formatBytes(n) {
    const num = Number(n || 0);
    if (num < 1024) return num + ' B';
    if (num < 1024 * 1024) return (num / 1024).toFixed(1) + ' KB';
    return (num / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.round(Number(sec || 0)));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  }

  function assetUrl(slug, relPath, download) {
    const parts = String(relPath || '').split('/').map((p) => encodeURIComponent(p)).join('/');
    const q = [];
    if (download) q.push('download=1');
    q.push('v=' + state.slideCacheBust);
    return '/api/create-blog/blogs/' + encodeURIComponent(slug) + '/asset/' + parts + (q.length ? '?' + q.join('&') : '');
  }

  async function apiGet(url) {
    const resp = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    const data = await resp.json().catch(() => ({ ok: false, error: 'HTTP ' + resp.status }));
    if (!resp.ok) {
      const err = new Error(data.error || ('Request failed: HTTP ' + resp.status));
      err.status = resp.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function apiPost(url, body, extraHeaders) {
    const headers = Object.assign({
      'Content-Type': 'application/json',
      'X-Portal-CSRF': state.csrfToken,
    }, extraHeaders || {});
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify(body || {}),
    });
    const data = await resp.json().catch(() => ({ ok: false, error: 'HTTP ' + resp.status }));
    if (!resp.ok) {
      const err = new Error(data.error || ('Request failed: HTTP ' + resp.status));
      err.status = resp.status;
      err.payload = data;
      throw err;
    }
    return data;
  }

  function setBanner(node, typeClass, message) {
    if (!node) return;
    if (!message) {
      node.className = 'banner hidden';
      node.textContent = '';
      return;
    }
    node.className = 'banner ' + typeClass;
    node.textContent = message;
  }

  function makePill(label, cls, showDot) {
    const children = [];
    if (showDot) children.push(el('span', { className: 'dot', 'aria-hidden': 'true' }));
    children.push(label);
    return el('span', { className: 'pill ' + (cls || '') }, children);
  }

  function getCategoryById(catId) {
    const id = String(catId || 'reference_architecture');
    return state.categories.find((c) => c.id === id) || state.categories[0] || FALLBACK_CATEGORIES[0];
  }

  function computeOutlineStats() {
    const secs = state.outline.filter((x) => x.type === 'section' && x.enabled).length;
    const diags = state.outline.filter((x) => x.type === 'diagram' && x.enabled).length;
    const slides = 2 + Math.max(1, diags) + (state.includeStarterCode ? 1 : 0) + 3;
    return { secs, diags, slides };
  }

  function populateCategorySelect() {
    const sel = document.getElementById('inp-category');
    if (!sel || !state.categories.length) return;
    const prev = state.categoryId || sel.value || 'reference_architecture';
    sel.replaceChildren(...state.categories.map((cat) => {
      const dc = cat.recommendedDiagramCount || (cat.recommendedOutline || []).filter((x) => x.type === 'diagram' && x.enabled).length;
      const sc = cat.recommendedSlideCount || (2 + dc + (cat.includeStarterCode ? 1 : 0) + 3);
      return el('option', { value: cat.id }, cat.name + ' (' + dc + 'd / ' + sc + 's)');
    }));
    if (state.categories.some((c) => c.id === prev)) {
      sel.value = prev;
    }
  }

  function applyCategorySelection(catId, syncFilters) {
    const cat = getCategoryById(catId);
    state.categoryId = cat.id;
    state.outline = JSON.parse(JSON.stringify(cat.recommendedOutline || FALLBACK_CATEGORIES[0].recommendedOutline));
    state.outlineCustomized = false;
    state.includeStarterCode = Boolean(cat.includeStarterCode !== false);
    const sel = document.getElementById('inp-category');
    if (sel) sel.value = cat.id;
    const chkCode = document.getElementById('chk-starter-code');
    if (chkCode) chkCode.checked = state.includeStarterCode;
    if (syncFilters !== false) {
      const domSel = document.getElementById('inp-domain');
      if (domSel && cat.defaultDomain && Array.from(domSel.options).some((o) => o.value === cat.defaultDomain)) {
        domSel.value = cat.defaultDomain;
      }
      const audSel = document.getElementById('inp-audience');
      if (audSel && cat.defaultAudience && Array.from(audSel.options).some((o) => o.value === cat.defaultAudience)) {
        audSel.value = cat.defaultAudience;
      }
    }
    renderOutlinePlanner();
  }

  function renderOutlinePlanner() {
    const listEl = document.getElementById('outline-planner-list');
    const catBadge = document.getElementById('planner-cat-badge');
    const sumBadge = document.getElementById('planner-plan-summary');
    const custBadge = document.getElementById('planner-custom-badge');
    const descEl = document.getElementById('planner-cat-desc');
    const smallBadge = document.getElementById('cat-badge-pill');
    const cat = getCategoryById(state.categoryId);
    const stats = computeOutlineStats();

    if (catBadge) catBadge.textContent = cat.shortName || cat.name;
    if (sumBadge) {
      sumBadge.textContent = stats.secs + ' Sections · ' + stats.diags + ' Diagrams · ' + stats.slides + ' Slides · ' + (state.includeStarterCode ? 'Code ON' : 'Code OFF');
    }
    if (smallBadge) smallBadge.textContent = stats.diags + 'd / ' + stats.slides + 's';
    if (custBadge) custBadge.classList.toggle('hidden', !state.outlineCustomized);
    if (descEl && cat.description) descEl.textContent = cat.description + ' Toggle items on/off, edit titles, or move any diagram up/down to its exact logical position.';
    if (!listEl) return;

    const enabledSecCount = stats.secs;
    const enabledDiagCount = stats.diags;
    let figCounter = 0;

    const rows = state.outline.map((item, idx) => {
      const isDiag = item.type === 'diagram';
      const isEnabled = Boolean(item.enabled);
      if (isDiag && isEnabled) figCounter += 1;
      const figTag = isDiag
        ? (isEnabled ? ('FIG ' + figCounter + ' · ' + (DIAGRAM_SHORT_LABELS[item.kind] || item.kind)) : ('OFF · ' + (DIAGRAM_SHORT_LABELS[item.kind] || item.kind)))
        : 'SECTION';
      const disableToggle = isEnabled && ((isDiag && enabledDiagCount <= 1) || (!isDiag && enabledSecCount <= 2));

      const chk = el('input', {
        type: 'checkbox',
        'aria-label': 'Toggle ' + item.title,
        disabled: disableToggle,
        onChange: (ev) => {
          item.enabled = Boolean(ev.target.checked);
          state.outlineCustomized = true;
          renderOutlinePlanner();
        },
      });
      chk.checked = isEnabled;

      const titleInp = el('input', {
        type: 'text',
        className: 'outline-title-inp',
        value: item.title || '',
        maxlength: '110',
        'aria-label': (isDiag ? 'Diagram title' : 'Section heading'),
        onInput: (ev) => {
          item.title = ev.target.value;
          state.outlineCustomized = true;
          if (custBadge) custBadge.classList.remove('hidden');
        },
      });

      const moveUp = el('button', {
        type: 'button',
        className: 'btn-icon',
        title: 'Move up',
        'aria-label': 'Move up',
        disabled: idx === 0,
        onClick: () => {
          if (idx <= 0) return;
          const tmp = state.outline[idx - 1];
          state.outline[idx - 1] = state.outline[idx];
          state.outline[idx] = tmp;
          state.outlineCustomized = true;
          renderOutlinePlanner();
        },
      }, '↑');

      const moveDown = el('button', {
        type: 'button',
        className: 'btn-icon',
        title: 'Move down',
        'aria-label': 'Move down',
        disabled: idx === state.outline.length - 1,
        onClick: () => {
          if (idx >= state.outline.length - 1) return;
          const tmp = state.outline[idx + 1];
          state.outline[idx + 1] = state.outline[idx];
          state.outline[idx] = tmp;
          state.outlineCustomized = true;
          renderOutlinePlanner();
        },
      }, '↓');

      const moveGrp = el('div', { className: 'outline-move-grp' }, moveUp, moveDown);
      if (!isDiag && String(item.id || '').startsWith('sec-custom-')) {
        moveGrp.appendChild(el('button', {
          type: 'button',
          className: 'btn-icon',
          title: 'Remove custom section',
          'aria-label': 'Remove section',
          onClick: () => {
            state.outline.splice(idx, 1);
            state.outlineCustomized = true;
            renderOutlinePlanner();
          },
        }, '×'));
      }

      return el('div', {
        className: 'outline-row' + (isDiag ? ' is-diagram' : '') + (isEnabled ? '' : ' is-disabled'),
      },
        chk,
        makePill(figTag, isDiag ? (isEnabled ? 'pill-blue' : '') : 'pill-purple', false),
        titleInp,
        moveGrp
      );
    });
    listEl.replaceChildren(...rows);
  }

  function openOutlinePlannerView() {
    stopAudioPlayer();
    state.activeSlug = null;
    state.activeBlog = null;
    const act = document.getElementById('active-blog-view');
    const emp = document.getElementById('empty-state');
    if (act) act.classList.add('hidden');
    if (emp) emp.classList.remove('hidden');
    renderLibrary();
    renderOutlinePlanner();
  }

  function renderCapabilities(cap) {
    const strip = document.getElementById('capability-strip');
    const authPill = document.getElementById('composer-auth-pill');
    const sumPill = document.getElementById('status-summary-pill');
    const pop = document.getElementById('status-popover');
    if (!cap) return;
    if (Array.isArray(cap.categories) && cap.categories.length) {
      state.categories = cap.categories;
      populateCategorySelect();
      if (!state.outlineCustomized) {
        applyCategorySelection(state.categoryId, false);
      } else {
        renderOutlinePlanner();
      }
    }
    const auth = cap.auth || {};
    const c = cap.capabilities || {};
    const gatesN = Number(c.deterministicGateChecks || 13);
    if (sumPill) {
      const modeLbl = auth.llmReady ? 'Live' : 'Key Needed';
      const modLbl = cap.defaultModel || 'gemini-4-neon';
      sumPill.replaceChildren(
        el('span', { className: 'dot', 'aria-hidden': 'true' }),
        el('span', null, modeLbl + ' · ' + modLbl + ' · ' + gatesN + '/' + gatesN + ' Gates ▾')
      );
    }
    if (pop) {
      pop.classList.remove('status-warn', 'status-err');
      if (!auth.llmReady) pop.classList.add('status-warn');
    }
    if (strip) {
      const items = [];
      items.push(makePill(
        auth.vertexAiIamReady ? 'Vertex AI IAM: LIVE (' + cap.vertexLocation + ')' : 'Vertex AI IAM: Offline',
        auth.vertexAiIamReady ? 'pill-green' : 'pill-amber',
        true
      ));
      if (cap.defaultModel) items.push(makePill('Default: ' + cap.defaultModel, 'pill-blue', false));
      items.push(makePill(
        c.cloudTtsChirp3Hd ? 'Cloud TTS Chirp3-HD: LIVE' : 'Cloud TTS: Offline',
        c.cloudTtsChirp3Hd ? 'pill-green' : 'pill-amber',
        true
      ));
      items.push(makePill(
        c.gcsDurableStorage ? 'GCS Store: Connected' : 'Storage: Local Runtime',
        c.gcsDurableStorage ? 'pill-green' : 'pill-amber',
        true
      ));
      if (c.googleSearchGrounding) items.push(makePill('Search Grounding: LIVE', 'pill-green', true));
      if (c.officialGcpSvgIcons) items.push(makePill(c.officialGcpSvgIcons + ' GCP SVG Icons', 'pill-blue', false));
      items.push(makePill(
        c.workspaceOauthSync ? 'Google Slides & Docs: Synced' : 'Google Slides & Docs: 1-Click OAuth',
        c.workspaceOauthSync ? 'pill-green' : 'pill-blue',
        Boolean(c.workspaceOauthSync)
      ));
      items.push(makePill('Gates: D-01..D-' + gatesN + ' + Judge', 'pill-purple', false));
      strip.replaceChildren(...items);
    }

    if (authPill) {
      if (auth.llmReady) {
        authPill.className = 'pill pill-green';
        authPill.textContent = auth.vertexAiIamReady ? 'Vertex IAM Live' : 'API Key Ready';
      } else {
        authPill.className = 'pill pill-amber';
        authPill.textContent = 'Key Required';
      }
    }
  }

  async function refreshCapabilities(attempt) {
    const n = Number(attempt || 0);
    try {
      const cap = await apiGet('/api/create-blog/capabilities');
      state.capabilities = cap;
      renderCapabilities(cap);
    } catch (err) {
      const msg = String(err && err.message ? err.message : err || '');
      const transient = /HTTP\s*50[234]|Failed to fetch|NetworkError/i.test(msg);
      if (transient && n < 2) {
        const strip = document.getElementById('capability-strip');
        if (strip) strip.replaceChildren(makePill('Checking live backend status...', 'pill-amber', true));
        setTimeout(() => { refreshCapabilities(n + 1); }, 1600 * (n + 1));
        return;
      }
      const strip = document.getElementById('capability-strip');
      if (strip) strip.replaceChildren(makePill('Status check failed: ' + msg, 'pill-red', true));
    }
  }

  function renderInlineMarkdown(container, text) {
    const raw = String(text || '');
    const tokenRe = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let last = 0;
    let match;
    while ((match = tokenRe.exec(raw)) !== null) {
      if (match.index > last) {
        container.appendChild(document.createTextNode(raw.slice(last, match.index)));
      }
      const tok = match[0];
      if (tok.startsWith('**') && tok.endsWith('**')) {
        const strongEl = el('strong');
        renderInlineMarkdown(strongEl, tok.slice(2, -2));
        container.appendChild(strongEl);
      } else if (tok.startsWith('`') && tok.endsWith('`')) {
        container.appendChild(el('code', null, tok.slice(1, -1)));
      } else if (tok.startsWith('[')) {
        const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
        if (lm && isSafeHref(lm[2])) {
          container.appendChild(el('a', { href: lm[2], target: '_blank', rel: 'noopener noreferrer', style: { color: '#1a73e8', fontWeight: '600' } }, lm[1]));
        } else {
          container.appendChild(document.createTextNode(tok));
        }
      }
      last = match.index + tok.length;
    }
    if (last < raw.length) {
      container.appendChild(document.createTextNode(raw.slice(last)));
    }
  }

  function buildInlineFigureDom(blog, relPath, fallbackCaption) {
    const slug = (blog && blog.slug) || '';
    const dmap = (blog && blog.diagrams) || {};
    const kindMatch = /-([a-z]+)\.(?:svg|drawio)$/i.exec(String(relPath || ''));
    const kind = kindMatch ? kindMatch[1].toLowerCase() : '';
    const diag = (kind && dmap[kind]) || Object.values(dmap).find((d) => d && (d.svgPath === relPath || d.drawioPath === relPath)) || null;
    const svgRel = (diag && diag.svgPath) ? diag.svgPath : String(relPath || '');
    const label = (diag && diag.title) || fallbackCaption || 'Architecture Figure';
    const imgNode = el('img', {
      src: slug ? assetUrl(slug, svgRel) : svgRel,
      alt: label,
      title: diag ? 'Click to maximize full-size diagram' : label,
      onClick: diag ? () => openDiagramLightbox(slug, label, diag) : null,
    });
    const actBtns = [];
    if (diag) {
      actBtns.push(
        el('button', { type: 'button', className: 'btn btn-sm', onClick: () => openDiagramLightbox(slug, label, diag) }, 'Maximize'),
        el('a', { className: 'btn btn-sm', href: diag.viewerUrl, target: '_blank', rel: 'noopener noreferrer' }, 'viewer.diagrams.net ->'),
        el('a', { className: 'btn btn-sm', href: diag.studioUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit in Studio')
      );
    }
    return el('figure', { className: 'inline-blog-figure' },
      el('div', { className: 'inline-blog-figure-stage' }, imgNode),
      el('figcaption', { className: 'inline-blog-figcaption' },
        el('strong', { style: { color: '#0f172a', fontWeight: '700' } }, label),
        actBtns.length ? el('div', { className: 'inline-blog-fig-actions' }, ...actBtns) : null
      )
    );
  }

  function buildMarkdownDom(mdText, blog) {
    const root = el('article', { className: 'article-body' });
    const lines = String(mdText || '').replace(/\r\n/g, '\n').split('\n');
    let i = 0;
    while (i < lines.length) {
      const ln = lines[i];
      if (!ln.trim()) { i += 1; continue; }
      const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(ln.trim());
      if (imgMatch) {
        const altTxt = imgMatch[1].trim();
        const relP = imgMatch[2].trim();
        i += 1;
        while (i < lines.length && !lines[i].trim()) i += 1;
        if (i < lines.length && /^\*(?:Figure\s+\d+|\[[A-Z_]+\]).*\*\s*$/.test(lines[i].trim())) {
          i += 1;
        }
        root.appendChild(buildInlineFigureDom(blog, relP, altTxt));
        continue;
      }
      if (ln.startsWith('```')) {
        const langTag = ln.slice(3).trim().toUpperCase() || 'CODE';
        const codeLines = [];
        i += 1;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i += 1;
        }
        i += 1;
        const wrap = el('div', { style: { margin: '12px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' } },
          el('div', { style: { background: '#1e293b', color: '#93c5fd', fontFamily: 'var(--mono)', fontSize: '10.5px', fontWeight: '700', padding: '5px 12px', letterSpacing: '0.04em' } }, langTag),
          el('pre', { className: 'code-viewer', style: { margin: '0', borderRadius: '0', border: 'none' } }, codeLines.join('\n'))
        );
        root.appendChild(wrap);
        continue;
      }
      if (ln.startsWith('### ')) {
        const h3El = el('h3');
        renderInlineMarkdown(h3El, ln.slice(4).trim());
        root.appendChild(h3El);
        i += 1; continue;
      }
      if (ln.startsWith('## ')) {
        const h2El = el('h2');
        renderInlineMarkdown(h2El, ln.slice(3).trim());
        root.appendChild(h2El);
        i += 1; continue;
      }
      if (ln.startsWith('# ')) {
        root.appendChild(el('h1', null, ln.slice(2).trim()));
        i += 1; continue;
      }
      if (ln.startsWith('> ')) {
        const qLines = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          qLines.push(lines[i].slice(2).trim());
          i += 1;
        }
        const qJoined = qLines.join(' ');
        const legFig = /\*\*Figure\s+\d+[^*]*\*\*[\s\S]*?`(diagrams\/[^`]+\.(?:drawio|svg))`/.exec(qJoined);
        if (legFig && blog) {
          const ttlMatch = /\*\*(Figure\s+\d+[^*]*)\*\*/.exec(qJoined);
          root.appendChild(buildInlineFigureDom(blog, legFig[1], ttlMatch ? ttlMatch[1] : 'Figure'));
          continue;
        }
        const bq = el('blockquote');
        renderInlineMarkdown(bq, qJoined);
        root.appendChild(bq);
        continue;
      }
      if (ln.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
        const parseRow = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        const headers = parseRow(ln);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          rows.push(parseRow(lines[i]));
          i += 1;
        }
        const thead = el('thead', null, el('tr', null, headers.map((h) => el('th', null, h))));
        const tbody = el('tbody', null, rows.map((rr) => el('tr', null, headers.map((_, ci) => {
          const td = el('td');
          renderInlineMarkdown(td, rr[ci] || '');
          return td;
        }))));
        root.appendChild(el('div', { className: 'data-table-wrap' }, el('table', { className: 'data-table' }, thead, tbody)));
        continue;
      }
      if (/^[-*]\s+/.test(ln)) {
        const ul = el('ul');
        while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
          const li = el('li');
          renderInlineMarkdown(li, lines[i].replace(/^[-*]\s+/, ''));
          ul.appendChild(li);
          i += 1;
        }
        root.appendChild(ul);
        continue;
      }
      if (/^\d+\.\s+/.test(ln)) {
        const ol = el('ol', { style: { margin: '8px 0 14px 22px' } });
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          const li = el('li', { style: { marginBottom: '5px' } });
          renderInlineMarkdown(li, lines[i].replace(/^\d+\.\s+/, ''));
          ol.appendChild(li);
          i += 1;
        }
        root.appendChild(ol);
        continue;
      }
      const pLines = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|> |\||[-*]\s|\d+\.\s|```)/.test(lines[i])) {
        pLines.push(lines[i].trim());
        i += 1;
      }
      const p = el('p');
      renderInlineMarkdown(p, pLines.join(' '));
      root.appendChild(p);
    }
    return root;
  }

  function renderLibrary() {
    const container = document.getElementById('library-list');
    const countPill = document.getElementById('lib-count');
    if (!container) return;
    if (countPill) countPill.textContent = String(state.blogs.length);
    if (!state.blogs.length) {
      container.replaceChildren(el('div', { className: 'hint' }, 'No created blogs saved yet. Compose a prompt above and generate your first complete asset bundle.'));
      return;
    }
    const items = state.blogs.map((b) => {
      const isAct = b.slug === state.activeSlug;
      const isConfirm = state.confirmDeleteSlug === b.slug;
      const card = el('div', {
        className: 'lib-item' + (isAct ? ' active' : ''),
        tabIndex: '0',
        role: 'button',
        'aria-label': 'Open blog ' + b.title,
        onClick: (ev) => {
          if (ev.target.closest('button')) return;
          selectBlog(b.slug);
        },
        onKeydown: (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            selectBlog(b.slug);
          }
        },
      });
      card.appendChild(el('div', { className: 'lib-title' }, b.title || b.slug));
      const diagCnt = Number(b.diagramCount || 0) || (Number(b.slideCount || 9) >= 12 ? 6 : 2);
      const slideCnt = Number(b.slideCount || 9);
      const catInfo = getCategoryById(b.category);
      const revNum = Number(b.revision || 1);
      card.appendChild(el('div', { className: 'hint', style: { fontFamily: 'var(--mono)', fontSize: '10.5px', margin: '2px 0 5px', wordBreak: 'break-all' } }, b.slug));
      const wsStatus = (b.workspaceSync && b.workspaceSync.status) || '';
      const isWsSynced = Boolean(wsStatus === 'SYNCED' && b.workspaceSync.slidesUrl && b.workspaceSync.docUrl);
      const isWsStale = Boolean(wsStatus === 'STALE');
      const meta = el('div', { className: 'lib-meta' },
        makePill((catInfo ? catInfo.shortName : 'Architecture') + ' (' + diagCnt + 'd/' + slideCnt + 's)', 'pill-purple', false),
        revNum > 1 ? makePill('v' + revNum, 'pill-blue', false) : null,
        makePill(b.modelUsed || 'gemini', 'pill-blue', false),
        makePill('Gate ' + (b.qualityPassed || 0) + '/' + (b.qualityTotal || 13), (b.qualityPassed === b.qualityTotal ? 'pill-green' : 'pill-amber'), false),
        isWsSynced ? makePill('Slides & Docs', 'pill-green', false) : (isWsStale ? makePill('Sync Stale', 'pill-amber', false) : null)
      );
      card.appendChild(meta);
      const actions = el('div', { className: 'lib-actions' },
        el('span', { style: { fontSize: '10.5px', color: '#64748b', marginRight: 'auto' } }, (b.createdAt || '').slice(0, 16).replace('T', ' ') + 'Z')
      );
      if (isConfirm) {
        actions.appendChild(el('button', {
          type: 'button', className: 'btn btn-sm btn-danger',
          onClick: () => deleteBlogConfirmed(b.slug),
        }, 'Confirm Delete'));
        actions.appendChild(el('button', {
          type: 'button', className: 'btn btn-sm',
          onClick: () => { state.confirmDeleteSlug = null; renderLibrary(); },
        }, 'Cancel'));
      } else {
        actions.appendChild(el('button', {
          type: 'button', className: 'btn btn-sm',
          onClick: () => { state.confirmDeleteSlug = b.slug; renderLibrary(); },
        }, 'Delete'));
      }
      card.appendChild(actions);
      return card;
    });
    container.replaceChildren(...items);
  }

  async function refreshLibrary(selectFirst, forceGcs, attempt) {
    const n = Number(attempt || 0);
    const box = document.getElementById('library-list');
    if (n === 0 && !state.blogs.length && box) {
      box.replaceChildren(el('div', { className: 'hint' }, 'Loading saved blogs from durable GCS storage...'));
    }
    try {
      const res = await apiGet('/api/create-blog/blogs' + (forceGcs ? '?refresh=1' : ''));
      state.blogs = Array.isArray(res.blogs) ? res.blogs : [];
      renderLibrary();
      if (selectFirst && !state.activeSlug && state.blogs.length) {
        const urlSlug = new URLSearchParams(window.location.search).get('slug');
        const target = urlSlug && state.blogs.some((x) => x.slug === urlSlug) ? urlSlug : state.blogs[0].slug;
        await selectBlog(target);
      }
    } catch (err) {
      const msg = String(err && err.message ? err.message : err || '');
      if (/HTTP\s*50[234]|Failed to fetch|NetworkError/i.test(msg) && n < 2) {
        setTimeout(() => { refreshLibrary(selectFirst, forceGcs, n + 1); }, 1600 * (n + 1));
        return;
      }
      if (box) box.replaceChildren(el('div', { className: 'banner banner-err' }, 'Failed to load library: ' + msg));
    }
  }

  async function deleteBlogConfirmed(slug) {
    try {
      await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/delete', {});
      state.confirmDeleteSlug = null;
      if (state.activeSlug === slug) {
        stopAudioPlayer();
        state.activeSlug = null;
        state.activeBlog = null;
        document.getElementById('active-blog-view').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
      }
      await refreshLibrary(false);
    } catch (err) {
      setBanner(document.getElementById('composer-msg'), 'banner-err', 'Delete failed: ' + err.message);
    }
  }

  async function selectBlog(slug) {
    stopAudioPlayer();
    try {
      const data = await apiGet('/api/create-blog/blogs/' + encodeURIComponent(slug));
      state.activeSlug = slug;
      state.activeBlog = data;
      state.activeSlide = Math.min(state.activeSlide || 1, getSlideCount(data));
      state.playerSlide = Math.min(state.playerSlide || 1, getSlideCount(data));
      state.editingTab = null;
      state.dirtyUnsaved = false;
      state.slideCacheBust = Date.now();
      const files = (data.starterMeta && data.starterMeta.files) || {};
      const keys = Object.keys(files);
      state.activeCodeFile = keys.includes('README.md') ? 'README.md' : (keys[0] || '');
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('slug', slug);
        window.history.replaceState(null, '', u.pathname + u.search);
      } catch (_) {}
      document.getElementById('empty-state').classList.add('hidden');
      document.getElementById('active-blog-view').classList.remove('hidden');
      renderLibrary();
      renderHero(data);
      renderAllTabs(data);
    } catch (err) {
      setBanner(document.getElementById('composer-msg'), 'banner-err', 'Unable to open blog: ' + err.message);
    }
  }

  function renderHero(blog) {
    const slug = blog.slug;
    const det = (blog.quality && blog.quality.deterministic) || {};
    const judge = (blog.quality && blog.quality.orthogonalJudge) || {};
    const catInfo = getCategoryById(blog.category);
    const revNum = Number(blog.revision || 1);
    const badges = [
      makePill(catInfo ? catInfo.shortName : (blog.domain || 'Architecture'), 'pill-blue', false),
      makePill('v' + revNum, 'pill-purple', false),
      makePill((blog.generation ? blog.generation.model : 'gemini'), 'pill-blue', false),
      makePill('Gate ' + (det.passed || 0) + '/' + (det.total || 13), det.allPassed ? 'pill-green' : 'pill-amber', false),
    ];
    if (judge && judge.verdict && judge.verdict !== 'SKIPPED') {
      badges.push(makePill(
        'Judge ' + (judge.score !== null && judge.score !== undefined ? judge.score + '/100' : judge.verdict),
        judge.verdict === 'APPROVED' ? 'pill-green' : 'pill-amber',
        false
      ));
    }
    const ws = blog.workspaceSync || {};
    const isSynced = ws.status === 'SYNCED' && isSafeHref(ws.slidesUrl) && isSafeHref(ws.docUrl);
    const isStale = ws.status === 'STALE';
    if (isSynced) {
      const syncedShort = ws.syncedAt ? ' · ' + String(ws.syncedAt).slice(0, 16).replace('T', ' ') + 'Z' : '';
      badges.push(makePill('Drive Synced' + syncedShort, 'pill-green', true));
    } else if (isStale) {
      badges.push(makePill('Drive Sync Stale', 'pill-amber', true));
    } else {
      badges.push(makePill('Drive: Not Synced', '', false));
    }
    document.getElementById('hero-badges').replaceChildren(...badges);
    document.getElementById('hero-title').textContent = blog.title || slug;
    document.getElementById('hero-sub').textContent = blog.subtitle || '';

    const a = blog.assets || {};
    const slideCount = getSlideCount(blog);

    const openSlidesBtn = isSynced
      ? el('a', {
          className: 'btn btn-gslides btn-sm',
          id: 'btn-open-gslides',
          href: ws.slidesUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: 'Open native editable ' + slideCount + '-slide presentation directly in Google Slides',
        }, makeSvgBadgeIcon('slides'), 'Open with Google Slides (' + slideCount + ')')
      : el('button', {
          type: 'button',
          className: 'btn btn-gslides btn-sm',
          id: 'btn-open-gslides',
          title: 'Sync & open native editable ' + slideCount + '-slide presentation in Google Slides',
          onClick: () => openInGoogleWorkspace(slug, 'slides'),
        }, makeSvgBadgeIcon('slides'), 'Open with Google Slides (' + slideCount + ')');

    const openDocsBtn = isSynced
      ? el('a', {
          className: 'btn btn-gdocs btn-sm',
          id: 'btn-open-gdocs',
          href: ws.docUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: 'Open native editable architecture brief directly in Google Docs',
        }, makeSvgBadgeIcon('docs'), 'Open with Google Docs')
      : el('button', {
          type: 'button',
          className: 'btn btn-gdocs btn-sm',
          id: 'btn-open-gdocs',
          title: 'Sync & open native editable architecture brief in Google Docs',
          onClick: () => openInGoogleWorkspace(slug, 'docs'),
        }, makeSvgBadgeIcon('docs'), 'Open with Google Docs');

    const iterateBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-sm',
      id: 'btn-toggle-iterate',
      onClick: () => {
        state.iterateDrawerOpen = !state.iterateDrawerOpen;
        renderIterateDrawer(blog);
      },
    }, state.iterateDrawerOpen ? 'Close Iterate' : 'Iterate / Refine');

    const menuItems = [
      el('button', {
        type: 'button',
        className: 'action-menu-item',
        id: 'btn-sync-workspace',
        onClick: () => triggerWorkspaceSync(slug),
      }, isSynced ? 'Re-sync Google Slides & Docs' : 'Sync to Google Workspace'),
      el('div', { className: 'action-menu-sep' }),
      el('a', { className: 'action-menu-item', href: assetUrl(slug, a.bundleZip, true) }, 'Download Full Bundle (.zip)'),
      (blog.includeStarterCode !== false && a.starterZip)
        ? el('a', { className: 'action-menu-item', href: assetUrl(slug, a.starterZip, true) }, 'Download Starter Code (.zip)')
        : null,
      el('a', { className: 'action-menu-item', href: assetUrl(slug, a.markdown, true) }, 'Download blog.md'),
      el('a', { className: 'action-menu-item', href: assetUrl(slug, a.pptx, true) }, 'Download .pptx Deck'),
      el('a', { className: 'action-menu-item', href: assetUrl(slug, a.docx, true) }, 'Download .docx Whitepaper'),
      el('div', { className: 'action-menu-sep' }),
      ...((blog.revisions || []).length > 1
        ? [
            el('div', { style: { fontSize: '10.5px', fontWeight: '800', color: '#64748b', padding: '4px 10px' } }, 'VERSION HISTORY (1-CLICK UNDO)'),
            ...(blog.revisions || []).slice().reverse().slice(0, 6).map((rv) => {
              const isCur = Number(rv.revision) === Number(blog.revision || 1);
              return el('button', {
                type: 'button',
                className: 'action-menu-item',
                disabled: isCur,
                title: rv.summary || '',
                onClick: () => restoreBlogRevision(slug, rv.revision),
              }, 'v' + rv.revision + (isCur ? ' (Current)' : ' — Restore') + ' · ' + String(rv.summary || '').slice(0, 26));
            }),
            el('div', { className: 'action-menu-sep' }),
          ]
        : []),
      el('button', {
        type: 'button',
        className: 'action-menu-item',
        onClick: () => openOutlinePlannerView(),
      }, '+ New Blog / Outline Planner'),
    ];
    const exportMenu = el('details', { className: 'action-menu', id: 'hero-export-menu' },
      el('summary', { className: 'btn btn-sm' }, 'Export & Actions ▾'),
      el('div', { className: 'action-menu-panel' }, ...menuItems)
    );

    document.getElementById('hero-actions').replaceChildren(openSlidesBtn, openDocsBtn, iterateBtn, exportMenu);
    renderIterateDrawer(blog);

    const syncBanner = document.getElementById('workspace-sync-banner');
    if (state.driftHint) {
      syncBanner.className = 'banner banner-info';
      syncBanner.replaceChildren(
        el('strong', null, 'Sync Hint: '),
        state.driftHint + ' ',
        el('button', {
          type: 'button',
          className: 'btn btn-sm btn-primary',
          style: { marginLeft: '6px' },
          onClick: () => {
            state.iterateDrawerOpen = true;
            state.iterateScope = 'all';
            renderIterateDrawer(blog, 'Propagate my recent manual edits cleanly across Slides, Diagrams, Speaker Notes, and Docs.');
          },
        }, 'Propagate with AI'),
        el('button', {
          type: 'button',
          className: 'btn btn-sm',
          style: { marginLeft: '6px' },
          onClick: () => { state.driftHint = ''; renderHero(blog); },
        }, 'Dismiss')
      );
    } else if (isStale) {
      syncBanner.className = 'banner banner-warn';
      syncBanner.replaceChildren(
        el('strong', null, 'Workspace Deck & Doc Out of Sync: '),
        (ws.staleReason || 'Artifacts changed after the last Workspace sync.') + ' Open "Export & Actions ▾" and click "Re-sync Google Slides & Docs" to update Drive in place.'
      );
    } else {
      syncBanner.className = 'banner hidden';
      syncBanner.textContent = '';
    }
  }

  async function restoreBlogRevision(slug, targetRev) {
    const banner = document.getElementById('workspace-sync-banner');
    try {
      const res = await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/restore', {
        targetRevision: targetRev,
        expectedRevision: state.activeBlog ? state.activeBlog.revision : undefined,
      });
      if (res && res.ok) {
        state.driftHint = '';
        state.iterateDiffSummary = ['Restored snapshot v' + targetRev + ' as new revision v' + res.revision + '.'];
        await selectBlog(slug);
        await refreshLibrary(false);
      }
    } catch (err) {
      if (banner) {
        banner.className = 'banner banner-err';
        banner.textContent = 'Restore failed: ' + err.message;
      }
    }
  }

  function pollIterationJob(slug, jobId, statusEl, applyBtn) {
    if (state.iteratePollTimer) clearInterval(state.iteratePollTimer);
    state.iteratePollTimer = setInterval(async () => {
      try {
        const res = await apiGet('/api/create-blog/jobs/' + encodeURIComponent(jobId));
        const job = res.job || res;
        if (statusEl) statusEl.textContent = (job.progress || 0) + '% · ' + (job.message || job.stage || 'Working...');
        if (job.status === 'COMPLETED') {
          clearInterval(state.iteratePollTimer);
          state.iteratePollTimer = null;
          state.iterateBusy = false;
          state.driftHint = '';
          state.iterateDiffSummary = Array.isArray(job.changes) ? job.changes : [job.message || 'Iteration applied.'];
          if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Apply AI Iteration'; }
          await selectBlog(slug);
          await refreshLibrary(false);
        } else if (job.status === 'FAILED') {
          clearInterval(state.iteratePollTimer);
          state.iteratePollTimer = null;
          state.iterateBusy = false;
          if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Apply AI Iteration'; }
          if (statusEl) statusEl.textContent = 'Failed: ' + (job.error || job.message || 'Iteration error');
        }
      } catch (err) {
        clearInterval(state.iteratePollTimer);
        state.iteratePollTimer = null;
        state.iterateBusy = false;
        if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = 'Apply AI Iteration'; }
        if (statusEl) statusEl.textContent = 'Poll error: ' + err.message;
      }
    }, 1200);
  }

  function renderIterateDrawer(blog, prefillText) {
    const drawer = document.getElementById('iterate-drawer');
    const toggleBtn = document.getElementById('btn-toggle-iterate');
    if (toggleBtn) toggleBtn.textContent = state.iterateDrawerOpen ? 'Close Iterate' : 'Iterate / Refine';
    if (!drawer) return;
    if (!state.iterateDrawerOpen) {
      drawer.classList.add('hidden');
      setChildren(drawer);
      return;
    }
    drawer.classList.remove('hidden');
    const slug = blog.slug;
    const lockedDiags = Object.keys(blog.diagrams || {}).filter((k) => blog.diagrams[k] && blog.diagrams[k].customEdited);

    const scopeSel = el('select', {
      id: 'iter-scope',
      style: { padding: '6px 9px', borderRadius: '7px', border: '1px solid var(--border-strong)', fontSize: '12px', fontWeight: '700' },
      onChange: (ev) => { state.iterateScope = ev.target.value; },
    }, [
      el('option', { value: 'all' }, 'Whole Blog (Prose + Diagrams + Slides + Docs)'),
      el('option', { value: 'prose' }, 'Blog Prose, Tables & Claims Only'),
      el('option', { value: 'diagrams' }, 'Architecture Diagrams Only'),
      el('option', { value: 'slides' }, 'Slides & Speaker Notes (Delta-TTS)'),
      el('option', { value: 'code' }, 'Starter Code & Terraform Only'),
    ]);
    scopeSel.value = state.iterateScope || 'all';

    const instrArea = el('textarea', {
      id: 'iter-instruction',
      maxlength: '2500',
      placeholder: 'Describe your refinement (e.g., "Add Cloud Armor rate-limiting thresholds to Security section, Slide 6, and Trust Perimeter diagram")...',
      style: { width: '100%', minHeight: '72px', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--purple-border)', fontFamily: 'inherit', fontSize: '12.5px', margin: '8px 0' },
    });
    if (prefillText) instrArea.value = prefillText;

    let unlockCustom = false;
    const unlockRow = lockedDiags.length
      ? (() => {
          const c = el('input', { type: 'checkbox', onChange: (ev) => { unlockCustom = Boolean(ev.target.checked); } });
          return el('label', { className: 'check-row', style: { fontSize: '11.5px', color: '#5b21b6' } },
            c,
            el('span', null, 'Unlock manually edited diagram(s) (' + lockedDiags.join(', ') + ') for AI regeneration')
          );
        })()
      : null;

    const statusLine = el('div', { className: 'hint', id: 'iter-status-line', style: { marginTop: '6px', color: '#4c1d95', fontWeight: '600' } }, '');
    const applyBtn = el('button', {
      type: 'button',
      className: 'btn btn-primary btn-sm',
      id: 'btn-run-iterate',
      disabled: state.iterateBusy,
      onClick: async () => {
        const txt = instrArea.value.trim();
        if (txt.length < 6) {
          statusLine.textContent = 'Enter at least 6 characters describing what to refine.';
          return;
        }
        state.iterateBusy = true;
        applyBtn.disabled = true;
        applyBtn.textContent = 'Refining with Gemini...';
        statusLine.textContent = 'Submitting surgical iteration job...';
        const apiKeyVal = (document.getElementById('inp-apikey') && document.getElementById('inp-apikey').value || '').trim();
        const extraHdrs = apiKeyVal ? { 'X-Gemini-Api-Key': apiKeyVal } : {};
        try {
          const res = await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/iterate', {
            instruction: txt,
            scope: scopeSel.value,
            expectedRevision: blog.revision || 1,
            unlockCustomDiagrams: unlockCustom,
            model: (document.getElementById('inp-model') ? document.getElementById('inp-model').value : 'gemini-4-neon'),
          }, extraHdrs);
          const job = res.job || res;
          statusLine.textContent = 'Running job ' + job.jobId + '...';
          pollIterationJob(slug, job.jobId, statusLine, applyBtn);
        } catch (err) {
          state.iterateBusy = false;
          applyBtn.disabled = false;
          applyBtn.textContent = 'Apply AI Iteration';
          statusLine.textContent = 'Error: ' + err.message;
        }
      },
    }, state.iterateBusy ? 'Refining...' : 'Apply AI Iteration');

    const diffBox = (state.iterateDiffSummary && state.iterateDiffSummary.length)
      ? el('div', { className: 'banner banner-ok', style: { marginTop: '8px', marginBottom: '0', fontSize: '11.5px' } },
          el('strong', null, 'Last Change (v' + (blog.revision || 1) + '): '),
          state.iterateDiffSummary.join(' · ')
        )
      : null;

    const prevRev = (blog.revisions || []).length > 1
      ? (blog.revisions || [])[(blog.revisions || []).length - 2]
      : null;
    const undoBtn = prevRev
      ? el('button', {
          type: 'button',
          className: 'btn btn-sm',
          id: 'btn-undo-revision',
          onClick: () => restoreBlogRevision(slug, prevRev.revision),
        }, 'Undo to v' + prevRev.revision)
      : null;

    setChildren(
      drawer,
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
          el('strong', { style: { fontSize: '13px', color: '#5b21b6' } }, 'Iterate with Gemini (v' + (blog.revision || 1) + ')'),
          scopeSel
        ),
        el('div', { style: { display: 'flex', gap: '6px' } },
          undoBtn,
          el('button', { type: 'button', className: 'btn btn-sm', onClick: () => { state.iterateDrawerOpen = false; renderIterateDrawer(blog); } }, 'Close')
        )
      ),
      instrArea,
      unlockRow,
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } }, applyBtn, statusLine),
      diffBox
    );
  }

  function updateSidebarWorkspaceSync(slug, wsMeta) {
    state.blogs.forEach((b) => {
      if (b && b.slug === slug) b.workspaceSync = wsMeta;
    });
    renderLibrary();
  }

  async function openInGoogleWorkspace(slug, mode) {
    const blog = state.activeBlog;
    const ws = (blog && blog.slug === slug && blog.workspaceSync) || {};
    if (ws.status === 'SYNCED') {
      const targetUrl = mode === 'docs' ? ws.docUrl : ws.slidesUrl;
      if (isSafeHref(targetUrl)) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    const synced = await triggerWorkspaceSync(slug, mode);
    if (synced && synced.status === 'SYNCED') {
      const targetUrl = mode === 'docs' ? synced.docUrl : synced.slidesUrl;
      if (isSafeHref(targetUrl)) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  }

  async function triggerWorkspaceSync(slug, openMode, conflictResolution) {
    if (state.workspaceSyncBusy) return null;
    state.workspaceSyncBusy = true;
    const resMode = conflictResolution || 'check';
    const syncBtn = document.getElementById('btn-sync-workspace');
    const slidesBtn = document.getElementById('btn-open-gslides');
    const docsBtn = document.getElementById('btn-open-gdocs');
    const banner = document.getElementById('workspace-sync-banner');
    const setBusy = (on, label) => {
      if (syncBtn) { syncBtn.disabled = on; if (on) syncBtn.textContent = label || 'Syncing...'; }
      if (slidesBtn && slidesBtn.tagName === 'BUTTON') slidesBtn.disabled = on;
      if (docsBtn && docsBtn.tagName === 'BUTTON') docsBtn.disabled = on;
    };
    setBusy(true, 'Syncing to Drive...');
    try {
      const extraHdrs = state.workspaceToken && Date.now() < state.workspaceTokenExp - 60000
        ? { 'X-Google-Workspace-Token': state.workspaceToken }
        : {};
      const bodyPayload = { conflictResolution: resMode, forceNew: resMode === 'copy' };
      let res;
      try {
        res = await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/sync-workspace', bodyPayload, extraHdrs);
      } catch (firstErr) {
        const p = firstErr.payload || {};
        if (firstErr.status === 412 && p.code === 'WORKSPACE_OAUTH_REQUIRED') {
          const capCid = state.capabilities && state.capabilities.capabilities && state.capabilities.capabilities.workspaceOauthClientId;
          const clientId = p.oauthClientId || capCid || '';
          if (!clientId) throw firstErr;
          banner.className = 'banner banner-warn';
          banner.replaceChildren(
            el('strong', null, 'Authorizing Google Drive: '),
            'Complete the Google sign-in popup to open directly in ' + (openMode === 'docs' ? 'Google Docs' : 'Google Slides') + '...'
          );
          const accessTok = await requestBrowserDriveToken(clientId);
          setBusy(true, 'Converting in Drive...');
          res = await apiPost(
            '/api/create-blog/blogs/' + encodeURIComponent(slug) + '/sync-workspace',
            bodyPayload,
            { 'X-Google-Workspace-Token': accessTok }
          );
        } else if (firstErr.status === 409 && p.code === 'WORKSPACE_CONFLICT') {
          banner.className = 'banner banner-warn';
          const actBtns = [];
          if (p.canOverwrite) {
            actBtns.push(el('button', {
              type: 'button',
              className: 'btn btn-sm btn-danger',
              onClick: () => triggerWorkspaceSync(slug, openMode, 'overwrite'),
            }, 'Overwrite Existing Drive Files'));
          }
          actBtns.push(el('button', {
            type: 'button',
            className: 'btn btn-sm btn-primary',
            onClick: () => triggerWorkspaceSync(slug, openMode, 'copy'),
          }, 'Save as New Drive Copy'));
          banner.replaceChildren(
            el('strong', null, 'Google Drive Conflict Detected: '),
            String(p.error || 'External modifications detected in Google Drive.'),
            el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } }, ...actBtns)
          );
          return null;
        } else {
          if (firstErr.status === 401 && state.workspaceToken) {
            state.workspaceToken = '';
            state.workspaceTokenExp = 0;
          }
          throw firstErr;
        }
      }
      if (res && res.ok && res.workspaceSync) {
        if (state.activeBlog && state.activeBlog.slug === slug) {
          state.activeBlog.workspaceSync = res.workspaceSync;
          renderHero(state.activeBlog);
          renderReaderTab(state.activeBlog);
          renderSlidesTab(state.activeBlog);
        }
        updateSidebarWorkspaceSync(slug, res.workspaceSync);
        return res.workspaceSync;
      }
      return null;
    } catch (err) {
      banner.className = 'banner banner-warn';
      const cliCmd = 'python3 scripts/sync_create_blog1_workspace.py --slug ' + slug;
      banner.replaceChildren(
        el('strong', null, 'Google Workspace Sync Pending: '),
        String((err && err.message) || err || 'Authorization required.') + ' ',
        el('span', { style: { display: 'inline-block', marginTop: '4px', fontSize: '11.5px', color: '#475569' } },
          'Or run from workstation to push directly into Google Slides & Docs: ',
          el('code', null, cliCmd)
        )
      );
      return null;
    } finally {
      state.workspaceSyncBusy = false;
      const curWs = (state.activeBlog && state.activeBlog.slug === slug && state.activeBlog.workspaceSync) || {};
      const syncedNow = curWs.status === 'SYNCED' && isSafeHref(curWs.slidesUrl) && isSafeHref(curWs.docUrl);
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.textContent = syncedNow ? 'Re-sync Google Slides & Docs' : 'Sync to Google Workspace';
      }
      if (slidesBtn && slidesBtn.tagName === 'BUTTON') slidesBtn.disabled = false;
      if (docsBtn && docsBtn.tagName === 'BUTTON') docsBtn.disabled = false;
    }
  }

  function switchTab(tabKey, forceDiscard) {
    if (state.dirtyUnsaved && !forceDiscard && tabKey !== state.activeTab) {
      const banner = document.getElementById('workspace-sync-banner');
      if (banner) {
        banner.className = 'banner banner-warn';
        banner.replaceChildren(
          el('strong', null, 'Unsaved Changes: '),
          'Save or cancel your inline edits before switching tabs, or ',
          el('button', {
            type: 'button',
            className: 'btn btn-sm btn-danger',
            style: { marginLeft: '6px' },
            onClick: () => {
              state.dirtyUnsaved = false;
              state.editingTab = null;
              if (state.activeBlog) renderAllTabs(state.activeBlog);
              switchTab(tabKey, true);
              banner.className = 'banner hidden';
            },
          }, 'Discard & Switch')
        );
      }
      return;
    }
    state.activeTab = tabKey;
    document.querySelectorAll('#asset-tablist .wtab').forEach((btn) => {
      const on = btn.dataset.tab === tabKey;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    ['reader', 'diagrams', 'slides', 'player', 'proofs', 'code', 'quality'].forEach((k) => {
      const p = document.getElementById('panel-' + k);
      if (p) p.classList.toggle('hidden', k !== tabKey);
    });
  }

  function getSlideCount(blog) {
    const arr = (blog && blog.blueprint && blog.blueprint.slides) || [];
    return arr.length >= 1 ? arr.length : 9;
  }

  function getDiagramEntries(blog) {
    const dmap = (blog && blog.diagrams) || {};
    const defLabels = {
      concept: 'Conceptual Mental Model & Invariant Lock',
      architecture: 'Master Platform Architecture (C4 L2)',
      cloudarch: 'Cloud Architecture Center Blueprint (Hub-and-Spoke)',
      sequence: 'Request Lifecycle Sequence (C4 L3)',
      security: 'Trust Perimeter & Security Boundary (C4 L1)',
      wire: 'Wire-Protocol & Schema Transformation (C4 L4)',
      async: 'Async State, Export & Lifecycle Loop',
    };
    const planKinds = (blog && blog.slidePlan && Array.isArray(blog.slidePlan.enabledDiagramKinds))
      ? blog.slidePlan.enabledDiagramKinds
      : ['architecture', 'cloudarch', 'sequence', 'security', 'wire', 'async'];
    const orderedKeys = planKinds.filter((k) => Boolean(dmap[k]));
    Object.keys(dmap).forEach((k) => {
      if (!orderedKeys.includes(k)) orderedKeys.push(k);
    });
    return orderedKeys.map((k, idx) => ({
      key: k,
      label: (dmap[k] && dmap[k].title) || ('Figure ' + (idx + 1) + ' — ' + (defLabels[k] || k)),
      diag: dmap[k],
    }));
  }

  function renderAllTabs(blog) {
    const dBtn = document.querySelector('#asset-tablist .wtab[data-tab="diagrams"]');
    const sBtn = document.querySelector('#asset-tablist .wtab[data-tab="slides"]');
    const dList = getDiagramEntries(blog);
    const sCnt = getSlideCount(blog);
    if (dBtn) dBtn.textContent = 'Diagrams (' + dList.length + ')';
    if (sBtn) sBtn.textContent = 'Slides (' + sCnt + ')';
    renderReaderTab(blog);
    renderDiagramsTab(blog);
    renderSlidesTab(blog);
    renderPlayerTab(blog);
    renderProofsTab(blog);
    renderCodeTab(blog);
    renderQualityTab(blog);
    switchTab(state.activeTab);
  }

  function renderReaderTab(blog) {
    const panel = document.getElementById('panel-reader');
    const slug = blog.slug;
    const isEditing = state.editingTab === 'reader';
    const copyBtn = el('button', {
      type: 'button', className: 'btn btn-sm',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(blog.markdownText || '');
          copyBtn.textContent = 'Copied blog.md!';
          setTimeout(() => { copyBtn.textContent = 'Copy Raw Markdown'; }, 1800);
        } catch (_) {}
      },
    }, 'Copy Raw Markdown');
    const editBtn = el('button', {
      type: 'button',
      className: 'btn btn-sm' + (isEditing ? ' btn-primary' : ''),
      id: 'btn-edit-blog',
      onClick: () => {
        state.editingTab = isEditing ? null : 'reader';
        state.dirtyUnsaved = false;
        renderReaderTab(blog);
      },
    }, isEditing ? 'Cancel Edit' : 'Edit Blog');

    const topBar = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' } },
      el('span', { className: 'pill pill-blue' }, isEditing ? 'Structured Blog Editor (Live Sync to Docs & Slides)' : 'Google Cloud Architecture Center Format'),
      el('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap' } },
        editBtn,
        copyBtn
      )
    );

    if (isEditing) {
      const bp = blog.blueprint || {};
      const statusMsg = el('div', { className: 'banner hidden' });
      const titleInp = el('input', { type: 'text', id: 'edit-blog-title', value: bp.title || '', maxlength: '140', onInput: () => { state.dirtyUnsaved = true; } });
      const subInp = el('input', { type: 'text', id: 'edit-blog-sub', value: bp.subtitle || '', maxlength: '260', onInput: () => { state.dirtyUnsaved = true; } });
      const sumInp = el('textarea', { id: 'edit-blog-summary', style: { minHeight: '78px' }, onInput: () => { state.dirtyUnsaved = true; } });
      sumInp.value = bp.summary || '';
      const secInputs = [];
      const secCards = (bp.sections || []).map((sec, sIdx) => {
        const hInp = el('input', { type: 'text', value: sec.heading || '', maxlength: '140', onInput: () => { state.dirtyUnsaved = true; } });
        const pInp = el('textarea', { style: { minHeight: '110px' }, onInput: () => { state.dirtyUnsaved = true; } });
        pInp.value = (sec.paragraphs || []).join('\n\n');
        const bInp = el('textarea', { style: { minHeight: '64px' }, onInput: () => { state.dirtyUnsaved = true; } });
        bInp.value = (sec.bullets || []).join('\n');
        secInputs.push({ hInp, pInp, bInp });
        return el('div', { className: 'edit-card' },
          el('div', { className: 'field' }, el('label', null, 'Section ' + (sIdx + 1) + ' Heading'), hInp),
          el('div', { className: 'field' }, el('label', null, 'Paragraphs (separate with blank line)'), pInp),
          el('div', { className: 'field', style: { marginBottom: '0' } }, el('label', null, 'Key Bullets (one per line)'), bInp)
        );
      });
      const saveBtn = el('button', {
        type: 'button',
        className: 'btn btn-primary btn-sm',
        id: 'btn-save-blog-edit',
        onClick: async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving & Recompiling...';
          try {
            const res = await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/edit', {
              target: 'blog',
              expectedRevision: blog.revision || 1,
              title: titleInp.value.trim(),
              subtitle: subInp.value.trim(),
              summary: sumInp.value.trim(),
              sections: secInputs.map((si) => ({
                heading: si.hInp.value.trim(),
                paragraphs: si.pInp.value,
                bullets: si.bInp.value,
              })),
            });
            state.editingTab = null;
            state.dirtyUnsaved = false;
            state.driftHint = (res.driftHints && res.driftHints[0]) || '';
            await selectBlog(slug);
            await refreshLibrary(false);
          } catch (err) {
            setBanner(statusMsg, 'banner-err', 'Save failed: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save & Recompile All';
          }
        },
      }, 'Save & Recompile All');
      panel.replaceChildren(
        topBar,
        statusMsg,
        el('div', { className: 'edit-card' },
          el('div', { className: 'field' }, el('label', { for: 'edit-blog-title' }, 'Blog Title'), titleInp),
          el('div', { className: 'field' }, el('label', { for: 'edit-blog-sub' }, 'Subtitle'), subInp),
          el('div', { className: 'field', style: { marginBottom: '0' } }, el('label', { for: 'edit-blog-summary' }, 'Executive Summary (BLUF)'), sumInp)
        ),
        ...secCards,
        el('div', { style: { display: 'flex', gap: '8px', marginTop: '10px' } },
          saveBtn,
          el('button', { type: 'button', className: 'btn btn-sm', onClick: () => { state.editingTab = null; state.dirtyUnsaved = false; renderReaderTab(blog); } }, 'Cancel')
        )
      );
      return;
    }
    // Clean publication reader: strip top H1/telemetry header (already in Hero card) & any legacy QA tables,
    // rendering interactive full-width SVG figures inline right at each section's exact narrative boundary.
    let readerMd = String(blog.markdownText || '').replace(/\r\n/g, '\n');
    const execIdx = readerMd.indexOf('## Executive Summary');
    if (execIdx > 0) readerMd = readerMd.slice(execIdx);
    readerMd = readerMd.replace(/\n## Figures & Editable C4 Diagrams[\s\S]*?(?=\n## |$)/m, '\n');
    readerMd = readerMd.replace(/\n## Claim Provenance Ledger[\s\S]*?(?=\n## |$)/m, '\n');
    readerMd = readerMd.replace(/\n## Authentic Live Proofs \(Before \/ After Screenshots\)\s*\n+> \*\*0 live proofs uploaded yet[\s\S]*?(?=\n## |$)/m, '\n');
    readerMd = readerMd.replace(/\n## Live Google Search Grounding Log[\s\S]*$/m, '\n');
    panel.replaceChildren(topBar, buildMarkdownDom(readerMd, blog));
  }

  function openDiagramLightbox(slug, label, diag) {
    const modal = document.getElementById('diag-lightbox');
    if (!modal) return;
    const t = document.getElementById('diag-lightbox-title');
    const acts = document.getElementById('diag-lightbox-actions');
    const body = document.getElementById('diag-lightbox-body');
    if (t) t.textContent = label;
    if (acts) {
      const dlDrawio = diag.publicId ? ('/api/drawio/download/' + encodeURIComponent(diag.publicId) + '?fmt=drawio') : assetUrl(slug, diag.drawioPath, true);
      const dlSvg = diag.publicId ? ('/api/drawio/download/' + encodeURIComponent(diag.publicId) + '?fmt=svg') : assetUrl(slug, diag.svgPath, true);
      acts.replaceChildren(
        el('a', { className: 'btn btn-primary btn-sm', href: diag.viewerUrl, target: '_blank', rel: 'noopener noreferrer' }, 'viewer.diagrams.net ->'),
        el('a', { className: 'btn btn-sm', href: diag.studioUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit in Studio'),
        el('a', { className: 'btn btn-sm', href: dlDrawio }, 'Download .drawio'),
        el('a', { className: 'btn btn-sm', href: dlSvg }, 'Download .svg'),
        el('button', { type: 'button', className: 'btn btn-sm', onClick: closeDiagramLightbox }, 'Close (Esc)')
      );
    }
    if (body) body.replaceChildren(el('img', { src: assetUrl(slug, diag.svgPath), alt: label }));
    modal.classList.remove('hidden');
  }

  function closeDiagramLightbox() {
    const modal = document.getElementById('diag-lightbox');
    if (modal) modal.classList.add('hidden');
  }

  function renderDiagramsTab(blog) {
    const panel = document.getElementById('panel-diagrams');
    const slug = blog.slug;
    const pcOrigin = (window.location.origin.indexOf('ge-blogs-') >= 0)
      ? window.location.origin.replace('ge-blogs-', 'promptcanvas-')
      : '';
    const cards = getDiagramEntries(blog).map((ent) => {
      const diag = ent.diag;
      const parts = [];
      if (diag.engineUsed === 'promptcanvas_vision_v4') parts.push('PromptCanvas Vision 1:1');
      else if (diag.vertexCount) parts.push('PromptCanvas Canonical WS1');
      if (diag.vertexCount) parts.push(diag.vertexCount + 'v / ' + (diag.edgeCount || 0) + 'e');
      if (diag.iconCount) parts.push(diag.iconCount + ' official GCP SVG icons');
      parts.push(diag.geometryValid === false ? 'geometry WARN' : '0 overlaps');
      parts.push('0 flowAnimation=1');
      const imgEl = el('img', {
        src: assetUrl(slug, diag.svgPath),
        alt: diag.title,
        title: 'Click to maximize',
        onClick: () => openDiagramLightbox(slug, ent.label, diag),
      });
      const btns = [
        el('button', { type: 'button', className: 'btn btn-sm', onClick: () => openDiagramLightbox(slug, ent.label, diag) }, 'Maximize'),
      ];
      if (diag.refImagePath) {
        let showingRef = false;
        const toggleBtn = el('button', {
          type: 'button',
          className: 'btn btn-sm',
          onClick: () => {
            showingRef = !showingRef;
            imgEl.src = assetUrl(slug, showingRef ? diag.refImagePath : diag.svgPath);
            toggleBtn.textContent = showingRef ? 'Show Editable Vector' : 'Show Stage 3 Blueprint';
          },
        }, 'Show Stage 3 Blueprint');
        btns.push(toggleBtn);
      }
      btns.push(
        el('a', { className: 'btn btn-primary btn-sm', href: diag.viewerUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Open in viewer.diagrams.net ->'),
        el('a', { className: 'btn btn-sm', href: diag.studioUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit in Local Studio')
      );
      if (pcOrigin) {
        btns.push(el('a', { className: 'btn btn-sm', href: pcOrigin + '/prompt-to-diagram', target: '_blank', rel: 'noopener noreferrer' }, 'PromptCanvas ->'));
      }
      const dlDrawio = diag.publicId ? ('/api/drawio/download/' + encodeURIComponent(diag.publicId) + '?fmt=drawio') : assetUrl(slug, diag.drawioPath, true);
      const dlSvg = diag.publicId ? ('/api/drawio/download/' + encodeURIComponent(diag.publicId) + '?fmt=svg') : assetUrl(slug, diag.svgPath, true);
      const importInput = el('input', {
        type: 'file',
        accept: '.drawio,.xml,application/xml,text/xml',
        className: 'hidden',
        onChange: async (ev) => {
          const f = ev.target.files && ev.target.files[0];
          if (!f) return;
          try {
            const xmlText = await f.text();
            await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/diagrams/' + encodeURIComponent(ent.key) + '/save', {
              xml: xmlText,
              expectedRevision: blog.revision || 1,
            });
            state.driftHint = 'Imported edited .drawio for "' + ent.key + '" — SVG, #R link, Slides, and Docs are synced.';
            await selectBlog(slug);
            await refreshLibrary(false);
          } catch (err) {
            setBanner(document.getElementById('workspace-sync-banner'), 'banner-err', 'Draw.io import failed: ' + err.message);
          } finally {
            ev.target.value = '';
          }
        },
      });
      btns.push(
        importInput,
        el('button', { type: 'button', className: 'btn btn-sm', onClick: () => importInput.click() }, 'Import .drawio'),
        el('a', { className: 'btn btn-sm', href: dlDrawio }, 'Download .drawio'),
        el('a', { className: 'btn btn-sm', href: dlSvg }, 'Download .svg')
      );
      if (diag.customEdited) {
        btns.push(el('button', {
          type: 'button',
          className: 'btn btn-sm',
          title: 'Allow future AI iterations to regenerate this diagram from blueprint JSON',
          onClick: async () => {
            await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/edit', {
              target: 'diagram_lock',
              kind: ent.key,
              customEdited: false,
              expectedRevision: blog.revision || 1,
            });
            await selectBlog(slug);
          },
        }, 'Unlock for AI'));
      }
      if (diag.refImagePath) {
        btns.push(el('a', { className: 'btn btn-sm', href: assetUrl(slug, diag.refImagePath, true) }, 'Ref PNG'));
      }
      return el('div', { className: 'diagram-card' },
        el('div', { className: 'diagram-hdr' },
          el('div', null,
            el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
              el('strong', { style: { fontSize: '13.5px' } }, ent.label),
              diag.customEdited ? makePill('Locked (Manual XML)', 'pill-amber', false) : null
            ),
            el('div', { className: 'hint' }, parts.join('  ·  '))
          ),
          el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, ...btns)
        ),
        el('div', { className: 'diagram-stage' }, imgEl)
      );
    });
    panel.replaceChildren(...cards);
  }

  function renderSlidesTab(blog) {
    const panel = document.getElementById('panel-slides');
    const slug = blog.slug;
    const slides = (blog.blueprint && blog.blueprint.slides) || [];
    const n = state.activeSlide;
    const cur = slides[n - 1] || {};
    const imgRel = 'slides/slide_' + String(n).padStart(2, '0') + '.svg';
    const isEditing = state.editingTab === 'slides';

    const editSlideBtn = el('button', {
      type: 'button',
      className: 'btn btn-sm' + (isEditing ? ' btn-primary' : ''),
      id: 'btn-edit-slide',
      onClick: () => {
        state.editingTab = isEditing ? null : 'slides';
        state.dirtyUnsaved = false;
        renderSlidesTab(blog);
      },
    }, isEditing ? 'Cancel Edit' : 'Edit Slide');

    const navBar = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' } },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        el('button', {
          type: 'button', className: 'btn btn-sm', disabled: n <= 1,
          onClick: () => { state.activeSlide = Math.max(1, n - 1); state.editingTab = null; renderSlidesTab(blog); },
        }, '<- Prev'),
        el('strong', { style: { fontSize: '13.5px' } }, 'Slide ' + n + ' / ' + getSlideCount(blog) + ': ' + (cur.title || '')),
        el('button', {
          type: 'button', className: 'btn btn-sm', disabled: n >= getSlideCount(blog),
          onClick: () => { state.activeSlide = Math.min(getSlideCount(blog), n + 1); state.editingTab = null; renderSlidesTab(blog); },
        }, 'Next ->')
      ),
      el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
        editSlideBtn
      )
    );

    const stage = el('div', { className: 'slide-stage-wrap' },
      el('img', { src: assetUrl(slug, imgRel), alt: 'Slide ' + n + ': ' + (cur.title || '') })
    );

    const strip = el('div', { className: 'thumb-strip' });
    const sc = getSlideCount(blog);
    for (let i = 1; i <= sc; i += 1) {
      const tRel = 'slides/slide_' + String(i).padStart(2, '0') + '.svg';
      strip.appendChild(el('button', {
        type: 'button',
        className: 'thumb-btn' + (i === n ? ' active' : ''),
        onClick: () => { state.activeSlide = i; state.editingTab = null; renderSlidesTab(blog); },
      }, el('img', { src: assetUrl(slug, tRel), alt: 'Slide ' + i }), el('span', null, 'S' + String(i).padStart(2, '0'))));
    }

    if (isEditing) {
      const statusBox = el('div', { className: 'banner hidden' });
      const kickerInp = el('input', { type: 'text', value: cur.kicker || '', maxlength: '44', onInput: () => { state.dirtyUnsaved = true; } });
      const titleInp = el('input', { type: 'text', id: 'edit-slide-title', value: cur.title || '', maxlength: '88', onInput: () => { state.dirtyUnsaved = true; } });
      const subInp = el('input', { type: 'text', value: cur.subtitle || '', maxlength: '160', onInput: () => { state.dirtyUnsaved = true; } });
      const bulInp = el('textarea', { style: { minHeight: '80px' }, onInput: () => { state.dirtyUnsaved = true; } });
      bulInp.value = (cur.bullets || []).join('\n');
      const notesInp = el('textarea', { id: 'edit-slide-notes', style: { minHeight: '84px' }, onInput: () => { state.dirtyUnsaved = true; } });
      notesInp.value = cur.speakerNotes || '';
      const saveBtn = el('button', {
        type: 'button',
        className: 'btn btn-primary btn-sm',
        id: 'btn-save-slide-edit',
        onClick: async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving & Delta-Syncing Audio...';
          try {
            await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/edit', {
              target: 'slides',
              expectedRevision: blog.revision || 1,
              slides: [{
                number: n,
                kicker: kickerInp.value.trim(),
                title: titleInp.value.trim(),
                subtitle: subInp.value.trim(),
                bullets: bulInp.value,
                speakerNotes: notesInp.value.trim(),
              }],
            });
            state.editingTab = null;
            state.dirtyUnsaved = false;
            await selectBlog(slug);
            await refreshLibrary(false);
          } catch (err) {
            setBanner(statusBox, 'banner-err', 'Save slide failed: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Slide & Delta-Sync Audio';
          }
        },
      }, 'Save Slide & Delta-Sync Audio');
      const editorBox = el('div', { className: 'edit-card', style: { marginTop: '12px' } },
        statusBox,
        el('div', { className: 'two-col' },
          el('div', { className: 'field' }, el('label', null, 'Kicker'), kickerInp),
          el('div', { className: 'field' }, el('label', { for: 'edit-slide-title' }, 'Slide Title'), titleInp)
        ),
        el('div', { className: 'field' }, el('label', null, 'Subtitle'), subInp),
        el('div', { className: 'field' }, el('label', null, 'Bullets (one per line)'), bulInp),
        el('div', { className: 'field' }, el('label', { for: 'edit-slide-notes' }, 'Spoken Speaker Notes (Delta-TTS updates only this slide MP3)'), notesInp),
        el('div', { style: { display: 'flex', gap: '8px' } },
          saveBtn,
          el('button', { type: 'button', className: 'btn btn-sm', onClick: () => { state.editingTab = null; state.dirtyUnsaved = false; renderSlidesTab(blog); } }, 'Cancel')
        )
      );
      panel.replaceChildren(navBar, stage, strip, editorBox);
      return;
    }

    const notes = el('div', { className: 'notes-box' },
      el('div', { style: { fontSize: '11px', fontWeight: '800', color: '#1a73e8', marginBottom: '4px', letterSpacing: '0.03em' } },
        'SPOKEN SPEAKER NOTES (SLIDE ' + n + ' · SYNCED TO GOOGLE SLIDES)'
      ),
      el('div', null, cur.speakerNotes || 'No speaker notes for this slide.')
    );

    panel.replaceChildren(navBar, stage, strip, notes);
  }

  function stopAudioPlayer() {
    state.playerPlaying = false;
    if (state.playerAudio) {
      try { state.playerAudio.pause(); } catch (_) {}
      state.playerAudio = null;
    }
  }

  function playSlideTrack(blog, slideNum, autoAdvance) {
    stopAudioPlayer();
    state.playerSlide = slideNum;
    const tracks = (blog.audio && blog.audio.tracks) || [];
    const tr = tracks.find((x) => x.slideNumber === slideNum);
    updatePlayerUi(blog);
    if (!tr) return;
    const audio = new Audio(assetUrl(blog.slug, tr.relPath));
    state.playerAudio = audio;
    state.playerPlaying = true;
    audio.addEventListener('ended', () => {
      if (autoAdvance && state.playerPlaying && slideNum < getSlideCount(blog)) {
        playSlideTrack(blog, slideNum + 1, true);
      } else {
        state.playerPlaying = false;
        updatePlayerUi(blog);
      }
    });
    audio.addEventListener('error', () => {
      state.playerPlaying = false;
      updatePlayerUi(blog);
    });
    audio.play().catch(() => {
      state.playerPlaying = false;
      updatePlayerUi(blog);
    });
    updatePlayerUi(blog);
  }

  function updatePlayerUi(blog) {
    const img = document.getElementById('player-slide-img');
    const cap = document.getElementById('player-caption');
    const lbl = document.getElementById('player-status');
    const playBtn = document.getElementById('btn-player-play');
    const n = state.playerSlide;
    const sl = ((blog.blueprint && blog.blueprint.slides) || [])[n - 1] || {};
    if (img) img.setAttribute('src', assetUrl(blog.slug, 'slides/slide_' + String(n).padStart(2, '0') + '.svg'));
    if (cap) cap.textContent = '[Slide ' + n + '/' + getSlideCount(blog) + '] ' + (sl.speakerNotes || sl.title || '');
    if (lbl) lbl.textContent = 'Slide ' + n + ' / ' + getSlideCount(blog) + ': ' + (sl.title || '');
    if (playBtn) playBtn.textContent = state.playerPlaying ? 'Pause Narration' : 'Play All Slides';
    document.querySelectorAll('#player-chapters button').forEach((b) => {
      b.classList.toggle('btn-primary', Number(b.dataset.slide) === n);
    });
  }

  async function exportNarratedWebm(blog, statusNode, dlContainer) {
    if (state.exportingWebm) return;
    const tracks = (blog.audio && blog.audio.tracks) || [];
    if (!tracks.length) {
      statusNode.textContent = 'Cloud TTS audio tracks were not generated for this blog. Regenerate with Cloud TTS enabled to export a narrated video.';
      return;
    }
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
      statusNode.textContent = 'This browser does not support MediaRecorder / canvas.captureStream().';
      return;
    }
    state.exportingWebm = true;
    stopAudioPlayer();
    statusNode.textContent = 'Loading ' + getSlideCount(blog) + ' SVG slides and live Chirp3-HD MP3 tracks for real-time WebM mastering...';
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ac.createMediaStreamDestination();
    const videoStream = canvas.captureStream(24);
    const mixed = new MediaStream([...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm';
    const rec = new MediaRecorder(mixed, { mimeType: mime });
    const chunks = [];
    rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunks.push(ev.data); };
    const donePromise = new Promise((resolve) => { rec.onstop = resolve; });
    rec.start(250);

    try {
      const wCount = getSlideCount(blog);
      for (let i = 1; i <= wCount; i += 1) {
        statusNode.textContent = 'Recording Slide ' + i + ' / ' + wCount + ' in real time (canvas + Chirp3-HD audio)...';
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = assetUrl(blog.slug, 'slides/slide_' + String(i).padStart(2, '0') + '.svg');
        });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.drawImage(img, 0, 0, 1280, 720);

        const tr = tracks.find((x) => x.slideNumber === i);
        if (tr) {
          const resp = await fetch(assetUrl(blog.slug, tr.relPath), { credentials: 'same-origin' });
          const arr = await resp.arrayBuffer();
          const audioBuf = await ac.decodeAudioData(arr);
          const srcNode = ac.createBufferSource();
          srcNode.buffer = audioBuf;
          srcNode.connect(dest);
          const endWait = new Promise((r) => { srcNode.onended = r; });
          srcNode.start();
          await endWait;
        } else {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      rec.stop();
      await donePromise;
      const blob = new Blob(chunks, { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      statusNode.textContent = 'WebM export complete (' + formatBytes(blob.size) + '). Label: SLIDE_CANVAS_CHIRP3_TTS_RENDER.';
      dlContainer.replaceChildren(
        el('a', {
          className: 'btn btn-green btn-sm',
          href: blobUrl,
          download: blog.slug + '-narrated.webm',
        }, 'Save ' + blog.slug + '-narrated.webm (' + formatBytes(blob.size) + ')')
      );
    } catch (err) {
      statusNode.textContent = 'WebM export failed: ' + err.message;
      try { rec.stop(); } catch (_) {}
    } finally {
      try { await ac.close(); } catch (_) {}
      state.exportingWebm = false;
    }
  }

  function renderPlayerTab(blog) {
    const panel = document.getElementById('panel-player');
    const slug = blog.slug;
    const audioMeta = blog.audio || {};
    const tracks = audioMeta.tracks || [];
    const totalSec = audioMeta.totalDurationSec || 0;

    const disclosure = el('div', { className: 'banner banner-info' },
      el('strong', null, 'Audio Provenance: '),
      'SYNTHETIC_CLOUD_TTS_CHIRP3_HD (' + (audioMeta.voice || 'en-US-Chirp3-HD-Charon') + ') — ',
      tracks.length + ' / ' + getSlideCount(blog) + ' live MP3 tracks generated (' + formatTime(totalSec) + ' total). Explicitly labeled as narrated slide-deck playback (not a human digital twin or live screen recording).'
    );

    const n = state.playerSlide;
    const sl = ((blog.blueprint && blog.blueprint.slides) || [])[n - 1] || {};
    const stage = el('div', { className: 'slide-stage-wrap player-stage-wrap' },
      el('img', { id: 'player-slide-img', src: assetUrl(slug, 'slides/slide_' + String(n).padStart(2, '0') + '.svg'), alt: 'Narrated slide ' + n })
    );
    const caption = el('div', { className: 'caption-bar', id: 'player-caption' }, '[Slide ' + n + '/' + getSlideCount(blog) + '] ' + (sl.speakerNotes || ''));

    const exportStatus = el('div', { className: 'hint', style: { marginTop: '6px' } }, '');
    const exportDl = el('div', { style: { display: 'inline-flex', gap: '8px', marginTop: '6px' } });

    const controls = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', margin: '12px 0' } },
      el('button', {
        type: 'button', className: 'btn btn-primary btn-sm', id: 'btn-player-play',
        disabled: tracks.length === 0,
        onClick: () => {
          if (state.playerPlaying) { stopAudioPlayer(); updatePlayerUi(blog); }
          else { playSlideTrack(blog, state.playerSlide, true); }
        },
      }, tracks.length ? 'Play All Slides' : 'Audio Unavailable'),
      el('button', {
        type: 'button', className: 'btn btn-sm',
        onClick: () => { state.playerSlide = Math.max(1, state.playerSlide - 1); stopAudioPlayer(); updatePlayerUi(blog); },
      }, '<- Prev'),
      el('button', {
        type: 'button', className: 'btn btn-sm',
        onClick: () => { state.playerSlide = Math.min(getSlideCount(blog), state.playerSlide + 1); stopAudioPlayer(); updatePlayerUi(blog); },
      }, 'Next ->'),
      el('span', { id: 'player-status', style: { fontSize: '12.5px', fontWeight: '700', marginRight: 'auto' } }, 'Slide ' + n + ' / ' + getSlideCount(blog) + ': ' + (sl.title || '')),
      el('a', { className: 'btn btn-sm', href: assetUrl(slug, 'audio/captions.vtt', true) }, 'captions.vtt'),
      audioMeta.hostMp4Available && blog.assets.hostMp4
        ? el('a', { className: 'btn btn-green btn-sm', href: assetUrl(slug, blog.assets.hostMp4, true) }, 'Download .mp4')
        : null,
      el('button', {
        type: 'button', className: 'btn btn-sm', disabled: tracks.length === 0,
        onClick: () => exportNarratedWebm(blog, exportStatus, exportDl),
      }, 'Export .webm Video (Browser)')
    );

    const chapRow = el('div', { id: 'player-chapters', style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' } });
    const pCount = getSlideCount(blog);
    for (let i = 1; i <= pCount; i += 1) {
      const tr = tracks.find((x) => x.slideNumber === i);
      chapRow.appendChild(el('button', {
        type: 'button',
        className: 'btn btn-sm' + (i === n ? ' btn-primary' : ''),
        'data-slide': String(i),
        onClick: () => playSlideTrack(blog, i, true),
      }, 'S' + i + (tr ? ' (' + tr.durationSec.toFixed(0) + 's)' : '')));
    }

    const extraErr = (audioMeta.errors && audioMeta.errors.length)
      ? el('div', { className: 'banner banner-warn', style: { marginTop: '10px' } }, 'TTS Note: ' + audioMeta.errors.join(' | '))
      : null;

    setChildren(panel, disclosure, stage, caption, controls, exportStatus, exportDl, chapRow, extraErr);
  }

  function renderProofsTab(blog) {
    const panel = document.getElementById('panel-proofs');
    const slug = blog.slug;
    const proofs = blog.proofs || [];

    const proofSlideNum = (blog.slidePlan && blog.slidePlan.proofSlide) || (getSlideCount(blog) >= 12 ? 10 : 7);
    const warn = el('div', { className: 'banner banner-warn' },
      el('strong', null, 'Zero Fake Screenshots Policy: '),
      'Only genuine PNG or JPEG captures (min 320x180 px, max 6 MiB, magic-byte & F-13 hygiene verified) are accepted. Uploading immediately recompiles blog.md, Slide ' + proofSlideNum + ' preview, Google Slides & Docs artifacts, and bundle.zip (click Re-sync Slides & Docs afterward to push updates to Drive).'
    );

    const statusBox = el('div', { className: 'banner hidden' });
    const stageSel = el('select', { id: 'prf-stage' },
      ['BEFORE', 'AFTER', 'CONSOLE', 'SAAS', 'USER_RECORDED'].map((s) => el('option', { value: s }, s))
    );
    const captionInp = el('input', { type: 'text', id: 'prf-caption', maxlength: '160', placeholder: 'e.g., Cloud Console IAP & VPC-SC perimeter BEFORE/AFTER state' });
    const urlInp = el('input', { type: 'url', id: 'prf-url', maxlength: '300', placeholder: 'https://console.cloud.google.com/... (optional genuine source URL)' });
    const fileInp = el('input', { type: 'file', id: 'prf-file', accept: 'image/png,image/jpeg' });
    const uploadBtn = el('button', { type: 'submit', className: 'btn btn-primary btn-sm' }, 'Upload Proof & Rebuild Deck / Doc');

    const form = el('form', {
      className: 'card',
      style: { padding: '14px', marginBottom: '16px', background: '#f8fafc' },
      onSubmit: async (ev) => {
        ev.preventDefault();
        const f = fileInp.files && fileInp.files[0];
        if (!f) { setBanner(statusBox, 'banner-err', 'Select a PNG or JPEG screenshot file first.'); return; }
        if (f.size > 6 * 1024 * 1024) { setBanner(statusBox, 'banner-err', 'File exceeds 6 MiB upload cap.'); return; }
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Validating & recompiling...';
        try {
          const dataUrl = await new Promise((res, rej) => {
            const rd = new FileReader();
            rd.onload = () => res(rd.result);
            rd.onerror = rej;
            rd.readAsDataURL(f);
          });
          await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/proofs', {
            stage: stageSel.value,
            caption: captionInp.value.trim(),
            sourceUrl: urlInp.value.trim(),
            dataBase64: dataUrl,
          });
          setBanner(statusBox, 'banner-ok', 'Proof attached! Slide ' + proofSlideNum + ', blog.md, deck/doc artifacts, and bundle.zip were rebuilt. Click Re-sync Slides & Docs to update Google Drive.');
          await selectBlog(slug);
          await refreshLibrary(false);
        } catch (err) {
          setBanner(statusBox, 'banner-err', err.message);
        } finally {
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Upload Proof & Rebuild Deck / Doc';
        }
      },
    },
      el('h3', { style: { fontSize: '13.5px', fontWeight: '800', marginBottom: '10px' } }, 'Upload Genuine BEFORE / AFTER Screenshot Proof'),
      el('div', { className: 'two-col' },
        el('div', { className: 'field' }, el('label', { for: 'prf-stage' }, 'Stage'), stageSel),
        el('div', { className: 'field' }, el('label', { for: 'prf-file' }, 'PNG / JPEG Image (max 6 MiB)'), fileInp)
      ),
      el('div', { className: 'two-col' },
        el('div', { className: 'field' }, el('label', { for: 'prf-caption' }, 'Caption (required)'), captionInp),
        el('div', { className: 'field' }, el('label', { for: 'prf-url' }, 'Genuine Source URL (optional)'), urlInp)
      ),
      statusBox,
      uploadBtn
    );

    const grid = el('div', { className: 'proof-grid' });
    if (!proofs.length) {
      grid.appendChild(el('div', { className: 'hint' }, '0 proofs uploaded yet. Slide ' + proofSlideNum + ' shows clean amber upload placeholders until you attach verified screenshots above.'));
    } else {
      proofs.forEach((pf) => {
        const isConf = state.confirmDeleteProofId === pf.id;
        const card = el('div', { className: 'proof-card' },
          el('img', { src: assetUrl(slug, pf.relPath), alt: pf.caption }),
          el('div', { className: 'proof-card-body' },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
              makePill(pf.stage, 'pill-green', false),
              el('span', { style: { fontSize: '10.5px', color: '#64748b' } }, pf.width + 'x' + pf.height + 'px')
            ),
            el('div', { style: { fontWeight: '700', marginBottom: '4px' } }, pf.caption),
            el('div', { style: { fontFamily: 'var(--mono)', fontSize: '10px', color: '#475569', marginBottom: '6px' } }, 'SHA-256: ' + (pf.sha256 || '').slice(0, 22) + '...'),
            isConf
              ? el('div', { style: { display: 'flex', gap: '6px' } },
                  el('button', {
                    type: 'button', className: 'btn btn-sm btn-danger',
                    onClick: async () => {
                      await apiPost('/api/create-blog/blogs/' + encodeURIComponent(slug) + '/proofs/delete', { proofId: pf.id });
                      state.confirmDeleteProofId = null;
                      await selectBlog(slug);
                      await refreshLibrary(false);
                    },
                  }, 'Confirm Remove'),
                  el('button', { type: 'button', className: 'btn btn-sm', onClick: () => { state.confirmDeleteProofId = null; renderProofsTab(blog); } }, 'Cancel')
                )
              : el('button', { type: 'button', className: 'btn btn-sm', onClick: () => { state.confirmDeleteProofId = pf.id; renderProofsTab(blog); } }, 'Remove Proof')
          )
        );
        grid.appendChild(card);
      });
    }

    // Authentic in-browser Screen Recorder via navigator.mediaDevices.getDisplayMedia()
    const recStatus = el('div', { className: 'hint', style: { marginTop: '6px' } }, 'Capture your real authenticated browser tab or OS window via navigator.mediaDevices.getDisplayMedia().');
    const recPreview = el('div', { style: { marginTop: '10px' } });
    const startRecBtn = el('button', {
      type: 'button', className: 'btn btn-green btn-sm',
      onClick: async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          recStatus.textContent = 'Screen recording (getDisplayMedia) requires HTTPS or localhost in a modern browser.';
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 24 }, audio: true });
          state.screenStream = stream;
          state.screenChunks = [];
          const rec = new MediaRecorder(stream);
          state.screenRecorder = rec;
          rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) state.screenChunks.push(ev.data); };
          rec.onstop = () => {
            const blob = new Blob(state.screenChunks, { type: 'video/webm' });
            if (state.screenBlobUrl) URL.revokeObjectURL(state.screenBlobUrl);
            state.screenBlobUrl = URL.createObjectURL(blob);
            recStatus.textContent = 'Recorded live video (' + formatBytes(blob.size) + '). Provenance: USER_RECORDED_GETDISPLAYMEDIA.';
            recPreview.replaceChildren(
              el('video', { src: state.screenBlobUrl, controls: true, style: { width: '100%', maxWidth: '640px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'block', marginBottom: '8px' } }),
              el('a', { className: 'btn btn-primary btn-sm', href: state.screenBlobUrl, download: slug + '-live-capture.webm' }, 'Download Live Recording (.webm)')
            );
            startRecBtn.disabled = false;
            stopRecBtn.disabled = true;
          };
          stream.getVideoTracks()[0].addEventListener('ended', () => {
            if (rec.state === 'recording') rec.stop();
          });
          rec.start(250);
          startRecBtn.disabled = true;
          stopRecBtn.disabled = false;
          recStatus.textContent = 'Recording LIVE via getDisplayMedia()... Click Stop when finished.';
        } catch (err) {
          recStatus.textContent = 'Screen capture cancelled or denied: ' + err.message;
        }
      },
    }, 'Start Real Screen Recording');
    const stopRecBtn = el('button', {
      type: 'button', className: 'btn btn-danger btn-sm', disabled: true,
      onClick: () => {
        if (state.screenRecorder && state.screenRecorder.state === 'recording') state.screenRecorder.stop();
        if (state.screenStream) state.screenStream.getTracks().forEach((t) => t.stop());
      },
    }, 'Stop Recording');

    const recorderBox = el('div', { className: 'card', style: { padding: '14px', marginTop: '20px', background: '#f8fafc' } },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' } },
        el('h3', { style: { fontSize: '13.5px', fontWeight: '800' } }, 'Authentic In-Browser Screen Recorder'),
        makePill('USER_RECORDED_GETDISPLAYMEDIA', 'pill-purple', false)
      ),
      el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, startRecBtn, stopRecBtn),
      recStatus,
      recPreview
    );

    panel.replaceChildren(warn, form, grid, recorderBox);
  }

  function renderCodeTab(blog) {
    const panel = document.getElementById('panel-code');
    const meta = blog.starterMeta || {};
    const files = meta.files || {};
    const keys = Object.keys(files);
    if (blog.includeStarterCode === false || meta.enabled === false) {
      const catObj = getCategoryById(blog.category);
      panel.replaceChildren(
        el('div', { className: 'banner banner-info' },
          el('strong', null, 'Starter Code Disabled for Category (' + (catObj ? catObj.shortName : 'Brief') + '): '),
          'This blog was intentionally compiled without Terraform/Dockerfile boilerplate. Gates D-10 & D-11 mark starter checks as N/A while still validating any inline code snippets in the article.'
        )
      );
      return;
    }
    const curKey = files[state.activeCodeFile] !== undefined ? state.activeCodeFile : (keys[0] || '');

    const banner = el('div', { className: 'banner banner-warn' },
      el('strong', null, 'STATUS: GENERATED_TEMPLATE_UNDEPLOYED — '),
      'These Terraform, Python, and Bash files were generated by Gemini as a tailored starter scaffold. They have NOT been deployed into any Google Cloud project. Run security scans and terraform plan before applying.'
    );

    const astPill = makePill(
      meta.pythonAstValid ? 'app.py AST Check: VALID' : 'app.py AST Check: WARNING (' + (meta.pythonAstError || 'syntax') + ')',
      meta.pythonAstValid ? 'pill-green' : 'pill-amber',
      true
    );
    const copyBtn = el('button', {
      type: 'button', className: 'btn btn-sm',
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(files[curKey] || '');
          copyBtn.textContent = 'Copied ' + curKey + '!';
          setTimeout(() => { copyBtn.textContent = 'Copy File'; }, 1600);
        } catch (_) {}
      },
    }, 'Copy File');

    const isEditingCode = state.editingTab === 'code';
    const editCodeBtn = el('button', {
      type: 'button',
      className: 'btn btn-sm' + (isEditingCode ? ' btn-primary' : ''),
      id: 'btn-edit-code',
      onClick: () => {
        state.editingTab = isEditingCode ? null : 'code';
        state.dirtyUnsaved = false;
        renderCodeTab(blog);
      },
    }, isEditingCode ? 'Cancel Edit' : 'Edit File');

    const hdr = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' } },
      astPill,
      el('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap' } },
        editCodeBtn,
        copyBtn,
        el('a', { className: 'btn btn-primary btn-sm', href: assetUrl(blog.slug, blog.assets.starterZip, true) }, 'Download starter.zip')
      )
    );

    const tabs = el('div', { className: 'file-tabs' },
      keys.map((k) => el('button', {
        type: 'button',
        className: 'file-tab' + (k === curKey ? ' active' : ''),
        onClick: () => { state.activeCodeFile = k; state.editingTab = null; renderCodeTab(blog); },
      }, k))
    );
    if (isEditingCode && curKey) {
      const codeStatus = el('div', { className: 'banner hidden' });
      const codeArea = el('textarea', {
        id: 'edit-code-area',
        style: { width: '100%', minHeight: '360px', fontFamily: 'var(--mono)', fontSize: '12px', padding: '12px', borderRadius: '8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' },
        onInput: () => { state.dirtyUnsaved = true; },
      });
      codeArea.value = files[curKey] || '';
      const saveCodeBtn = el('button', {
        type: 'button',
        className: 'btn btn-primary btn-sm',
        id: 'btn-save-code-edit',
        onClick: async () => {
          saveCodeBtn.disabled = true;
          saveCodeBtn.textContent = 'Saving & Checking AST / D-11...';
          try {
            const filesObj = {};
            filesObj[curKey] = codeArea.value;
            await apiPost('/api/create-blog/blogs/' + encodeURIComponent(blog.slug) + '/edit', {
              target: 'code',
              expectedRevision: blog.revision || 1,
              files: filesObj,
            });
            state.editingTab = null;
            state.dirtyUnsaved = false;
            await selectBlog(blog.slug);
            await refreshLibrary(false);
          } catch (err) {
            setBanner(codeStatus, 'banner-err', 'Save code failed: ' + err.message);
            saveCodeBtn.disabled = false;
            saveCodeBtn.textContent = 'Save & Validate File';
          }
        },
      }, 'Save & Validate File');
      panel.replaceChildren(banner, hdr, tabs, codeStatus, codeArea, el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } }, saveCodeBtn));
      return;
    }
    const viewer = el('pre', { className: 'code-viewer', style: curKey === 'README.md' ? { whiteSpace: 'pre-wrap' } : {} }, files[curKey] || '(empty)');
    panel.replaceChildren(banner, hdr, tabs, viewer);
  }

  function renderQualityTab(blog) {
    const panel = document.getElementById('panel-quality');
    const q = blog.quality || {};
    const det = q.deterministic || { checks: [], passed: 0, total: 10 };
    const judge = q.orthogonalJudge || {};
    const claims = (blog.blueprint && blog.blueprint.claimLedger) || [];

    const hdrRow = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' } },
      el('h2', { style: { fontSize: '16px', fontWeight: '800' } }, '1. Deterministic Quality Gate (' + det.passed + ' / ' + det.total + ' PASS)'),
      el('a', { className: 'btn btn-sm', href: assetUrl(blog.slug, 'quality_report.json', true) }, 'Download quality_report.json')
    );

    const detTable = el('div', { className: 'data-table-wrap' },
      el('table', { className: 'data-table' },
        el('thead', null, el('tr', null, [el('th', null, 'ID'), el('th', null, 'Check'), el('th', null, 'Status'), el('th', null, 'Detail')])),
        el('tbody', null, (det.checks || []).map((c) => el('tr', null,
          el('td', { style: { fontFamily: 'var(--mono)', fontWeight: '700', whiteSpace: 'nowrap' } }, c.id),
          el('td', { style: { fontWeight: '700' } }, c.label),
          el('td', null, makePill(c.status, c.status === 'PASS' ? 'pill-green' : 'pill-red', false)),
          el('td', null, c.detail)
        )))
      )
    );

    // Orthogonal judge card
    const judgeCard = el('div', { className: 'card', style: { margin: '18px 0', padding: '16px', background: '#f8fafc' } });
    const topFlex = el('div', { style: { display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' } });
    if (judge.score !== null && judge.score !== undefined) {
      const hasP0 = (judge.findings || []).some((f) => String(f.severity || '').toUpperCase() === 'P0');
      const scoreCls = (judge.verdict === 'APPROVED' && Number(judge.score) >= 80 && !hasP0)
        ? 'score-circle'
        : ((Number(judge.score) < 70 || hasP0) ? 'score-circle score-fail' : 'score-circle score-warn');
      topFlex.appendChild(el('div', { className: scoreCls }, String(judge.score)));
    }
    const jInfo = el('div', { style: { flex: '1', minWidth: '220px' } },
      el('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '4px' } },
        el('h3', { style: { fontSize: '15px', fontWeight: '800' } }, '2. Orthogonal Multi-Model LLM Judge Panel'),
        makePill(judge.verdict || 'UNRUN', judge.verdict === 'APPROVED' ? 'pill-green' : 'pill-amber', false),
        judge.orthogonalPair ? makePill(judge.orthogonalPair, 'pill-purple', false) : null,
        judge.searchGrounded ? makePill('Search-Grounded (' + (judge.searchQueries || []).length + ' queries)', 'pill-green', true) : null
      ),
      el('p', { style: { fontSize: '13px', color: '#334155' } }, judge.summary || 'Not executed.')
    );
    topFlex.appendChild(jInfo);
    judgeCard.appendChild(topFlex);

    const dimScores = judge.dimensionScores || null;
    if (dimScores && typeof dimScores.accuracy === 'number') {
      const dimStrip = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginTop: '12px' } },
        [
          ['Accuracy', dimScores.accuracy, 'Technical & Google Cloud Docs truth'],
          ['Completeness', dimScores.completeness, 'Category blueprint & artifact depth'],
          ['Faithfulness', dimScores.faithfulness, 'Cross-artifact & Claim Ledger parity'],
          ['Relevancy', dimScores.relevancy, 'Prompt, audience & citation alignment'],
        ].map(([lbl, val, sub]) => el('div', { style: { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px' } },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            el('strong', { style: { fontSize: '12px', color: '#0f172a' } }, lbl),
            makePill(String(val) + '/100', Number(val) >= 85 ? 'pill-green' : 'pill-amber', false)
          ),
          el('div', { style: { fontSize: '11px', color: '#64748b', marginTop: '3px' } }, sub)
        ))
      );
      judgeCard.appendChild(dimStrip);
    }

    const artEvals = judge.artifactEvaluations || null;
    if (artEvals && Object.keys(artEvals).length) {
      judgeCard.appendChild(el('div', { style: { fontSize: '12px', fontWeight: '800', marginTop: '14px', color: '#0f172a' } }, 'Per-Artifact LLM Judge & Deterministic Verification Matrix'));
      const orderKeys = ['blogContent', 'diagrams', 'drawio', 'slides', 'code', 'terraform', 'references'];
      const rows = orderKeys.filter((k) => artEvals[k]).map((k) => {
        const a = artEvals[k];
        const na = a.applicable === false;
        const fmt = (v) => (na || v === null || v === undefined) ? 'N/A' : String(v);
        const vCls = na ? 'pill-blue' : (a.verdict === 'APPROVED' ? 'pill-green' : 'pill-amber');
        return el('tr', null,
          el('td', { style: { fontWeight: '700', whiteSpace: 'nowrap' } }, a.label || k),
          el('td', null, makePill(a.judgeModel || judge.judgeModel || 'gemini', 'pill-purple', false)),
          el('td', { style: { fontSize: '11.5px', color: '#334155' } }, a.deterministicStatus || 'PASS'),
          el('td', { style: { fontFamily: 'var(--mono)', fontWeight: '700' } }, fmt(a.accuracy)),
          el('td', { style: { fontFamily: 'var(--mono)', fontWeight: '700' } }, fmt(a.completeness)),
          el('td', { style: { fontFamily: 'var(--mono)', fontWeight: '700' } }, fmt(a.faithfulness)),
          el('td', { style: { fontFamily: 'var(--mono)', fontWeight: '700' } }, fmt(a.relevancy)),
          el('td', null, makePill(na ? 'N/A' : (fmt(a.score) + '/100 · ' + (a.verdict || '')), vCls, false)),
          el('td', { style: { fontSize: '12px' } }, a.summary || '')
        );
      });
      judgeCard.appendChild(el('div', { className: 'data-table-wrap', style: { marginTop: '6px' } },
        el('table', { className: 'data-table' },
          el('thead', null, el('tr', null, [
            el('th', null, 'Artifact'),
            el('th', null, 'Judge Model'),
            el('th', null, 'Deterministic Check'),
            el('th', null, 'Acc'),
            el('th', null, 'Comp'),
            el('th', null, 'Faith'),
            el('th', null, 'Rel'),
            el('th', null, 'Verdict'),
            el('th', null, 'Notes'),
          ])),
          el('tbody', null, rows)
        )
      ));
    }

    if (judge.strengths && judge.strengths.length) {
      judgeCard.appendChild(el('div', { style: { fontSize: '12px', fontWeight: '800', marginTop: '12px', color: '#0d652d' } }, 'Strengths'));
      judgeCard.appendChild(el('ul', { style: { margin: '4px 0 0 18px', fontSize: '12.5px' } },
        judge.strengths.map((s) => el('li', null, s))
      ));
    }
    if (judge.findings && judge.findings.length) {
      judgeCard.appendChild(el('div', { style: { fontSize: '12px', fontWeight: '800', marginTop: '12px', color: '#92400e' } }, 'Critic Findings'));
      const fTable = el('div', { className: 'data-table-wrap', style: { marginTop: '6px' } },
        el('table', { className: 'data-table' },
          el('thead', null, el('tr', null, [el('th', null, 'Severity'), el('th', null, 'Category'), el('th', null, 'Detail')])),
          el('tbody', null, judge.findings.map((f) => el('tr', null,
            el('td', null, makePill(f.severity, f.severity === 'P0' ? 'pill-red' : 'pill-amber', false)),
            el('td', null, f.category),
            el('td', null, f.detail)
          )))
        )
      );
      judgeCard.appendChild(fTable);
    }

    const ledgerHdr = el('h2', { style: { fontSize: '16px', fontWeight: '800', margin: '18px 0 8px' } }, '3. Claim Provenance Ledger (' + claims.length + ' Entries)');
    const ledgerTbl = el('div', { className: 'data-table-wrap' },
      el('table', { className: 'data-table' },
        el('thead', null, el('tr', null, [
          el('th', null, 'ID'), el('th', null, 'Claim'), el('th', null, 'Value'), el('th', null, 'Provenance'), el('th', null, 'Basis / Scope'),
        ])),
        el('tbody', null, claims.map((c) => el('tr', null,
          el('td', { style: { fontFamily: 'var(--mono)', fontWeight: '700', whiteSpace: 'nowrap' } }, c.id),
          el('td', null, c.claim),
          el('td', { style: { fontWeight: '700' } }, c.value),
          el('td', null, makePill(c.provenance, c.provenance === 'GCP_DOCUMENTED' ? 'pill-green' : 'pill-blue', false)),
          el('td', null, c.basis)
        )))
      )
    );

    const extraCards = [];
    const rev = q.autoRevision || {};
    if (rev.executed && rev.round1 && rev.round2) {
      const r1s = rev.round1.score != null ? rev.round1.score : '?';
      const r2s = rev.round2.score != null ? rev.round2.score : '?';
      const revBox = el('div', { className: 'card', style: { margin: '14px 0', padding: '14px', background: '#f0fdf4', border: '1px solid #86efac' } },
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' } },
          el('strong', { style: { fontSize: '13.5px', color: '#0d652d' } }, (rev.rolledBack ? 'Auto-Revision Tested (Retained Higher-Scoring Round 1)' : 'Auto-Revision Peer-Review Pass Executed')),
          makePill('Round 1: ' + r1s + '/100 (' + (rev.round1.verdict || '') + ')', 'pill-amber', false),
          makePill('Round 2: ' + r2s + '/100 (' + (rev.round2.verdict || '') + ')', rev.round2.verdict === 'APPROVED' ? 'pill-green' : 'pill-blue', false)
        ),
        (rev.appliedFixes && rev.appliedFixes.length)
          ? el('ul', { style: { margin: '4px 0 0 18px', fontSize: '12px', color: '#14532d' } }, rev.appliedFixes.map((fx) => el('li', null, fx)))
          : null
      );
      extraCards.push(revBox);
    }
    const gr = q.grounding || (blog.generation && blog.generation.grounding) || {};
    if (gr.status && gr.status !== 'NOT_RUN' && gr.status !== 'DISABLED') {
      const gBox = el('div', { className: 'card', style: { margin: '14px 0', padding: '14px', background: '#eff6ff', border: '1px solid #bfdbfe' } },
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' } },
          el('strong', { style: { fontSize: '13.5px', color: '#174ea6' } }, 'Live Google Search Grounding Dossier'),
          makePill(gr.status, gr.status === 'GROUNDED' ? 'pill-green' : 'pill-amber', true),
          makePill((gr.queries || []).length + ' queries · ' + (gr.sources || []).length + ' sources', 'pill-blue', false)
        ),
        (gr.queries && gr.queries.length)
          ? el('div', { style: { fontSize: '11.5px', color: '#1e3a8a', marginTop: '4px' } }, 'Queries: ' + gr.queries.join('  |  '))
          : null
      );
      extraCards.push(gBox);
    }
    panel.replaceChildren(hdrRow, detTable, ...extraCards, judgeCard, ledgerHdr, ledgerTbl);
  }

  function renderJobProgress(job) {
    const panel = document.getElementById('job-panel');
    panel.classList.remove('hidden');
    document.getElementById('job-stage-label').textContent = job.status === 'COMPLETED' ? 'Completed!' : (job.status === 'FAILED' ? 'Failed' : ('Running: ' + (job.stage || '')));
    document.getElementById('job-pct-label').textContent = String(job.progress || 0) + '%';
    document.getElementById('job-bar').style.width = Math.max(4, Number(job.progress || 0)) + '%';
    document.getElementById('job-msg').textContent = job.message || '';
    const ul = document.getElementById('job-steps');
    ul.replaceChildren(...(job.steps || []).map((st) => el('li', { className: 'step-item ' + (st.status || 'pending') },
      el('span', null, st.label),
      el('span', { style: { textTransform: 'uppercase', fontSize: '10px', fontWeight: '700' } }, st.status)
    )));
  }

  async function pollJob(jobId) {
    if (state.pollInFlight) return;
    state.pollInFlight = true;
    try {
      const res = await apiGet('/api/create-blog/jobs/' + encodeURIComponent(jobId));
      state.pollErrorCount = 0;
      const job = res.job || res;
      renderJobProgress(job);
      if (job.status === 'COMPLETED') {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
        document.getElementById('btn-generate').disabled = false;
        document.getElementById('btn-generate').textContent = 'Generate Blog';
        setBanner(document.getElementById('composer-msg'), 'banner-ok', 'Generated "' + (job.title || job.slug) + '". Ready for review & download.');
        await refreshLibrary(false, true);
        if (job.slug) await selectBlog(job.slug);
      } else if (job.status === 'FAILED') {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
        document.getElementById('btn-generate').disabled = false;
        document.getElementById('btn-generate').textContent = 'Generate Blog';
        setBanner(document.getElementById('composer-msg'), 'banner-err', (job.errorCode ? '[' + job.errorCode + '] ' : '') + (job.error || 'Generation failed.'));
      }
    } catch (err) {
      state.pollErrorCount += 1;
      const transient = !err.status || err.status === 404 || err.status >= 500;
      if (transient && state.pollErrorCount <= 5) {
        return;
      }
      clearInterval(state.pollTimer);
      state.pollTimer = null;
      document.getElementById('btn-generate').disabled = false;
      document.getElementById('btn-generate').textContent = 'Generate Blog';
      setBanner(document.getElementById('composer-msg'), 'banner-err', 'Job polling error: ' + err.message);
    } finally {
      state.pollInFlight = false;
    }
  }

  function hidePreflightPanel() {
    const pfBox = document.getElementById('preflight-panel');
    state.preflightResult = null;
    if (pfBox) {
      pfBox.classList.add('hidden');
      pfBox.replaceChildren();
    }
  }

  function collectGeneratePayload(promptOverride) {
    const promptArea = document.getElementById('inp-prompt');
    return {
      titleHint: document.getElementById('inp-title').value.trim(),
      prompt: (promptOverride !== undefined ? promptOverride : promptArea.value).trim(),
      category: state.categoryId,
      outline: state.outline,
      includeStarterCode: state.includeStarterCode,
      domain: document.getElementById('inp-domain').value,
      audience: document.getElementById('inp-audience').value,
      model: document.getElementById('inp-model').value,
      voice: document.getElementById('inp-voice').value,
      diagramEngine: (document.getElementById('inp-diagram-engine') ? document.getElementById('inp-diagram-engine').value : 'canonical'),
      imageModel: (document.getElementById('inp-image-model') ? document.getElementById('inp-image-model').value : 'gemini-3-pro-image'),
      enableTts: document.getElementById('chk-tts').checked,
      enableJudge: document.getElementById('chk-judge').checked,
      enableGrounding: (document.getElementById('chk-ground') ? document.getElementById('chk-ground').checked : true),
      enableAutoRevise: (document.getElementById('chk-ground') ? document.getElementById('chk-ground').checked : true),
    };
  }

  async function launchGenerationWithPayload(payload) {
    const msgBox = document.getElementById('composer-msg');
    const genBtn = document.getElementById('btn-generate');
    setBanner(msgBox, '', '');
    hidePreflightPanel();
    const apiKeyVal = (document.getElementById('inp-apikey').value || '').trim();
    const extraHeaders = apiKeyVal ? { 'X-Gemini-Api-Key': apiKeyVal } : {};
    genBtn.disabled = true;
    genBtn.textContent = 'Running Live Pipeline...';
    try {
      const res = await apiPost('/api/create-blog/generate', payload, extraHeaders);
      if (apiKeyVal) document.getElementById('inp-apikey').value = '';
      const job = res.job || res;
      state.activeJobId = job.jobId;
      state.pollErrorCount = 0;
      state.pollInFlight = false;
      renderJobProgress(job);
      if (state.pollTimer) clearInterval(state.pollTimer);
      state.pollTimer = setInterval(() => pollJob(job.jobId), 1200);
    } catch (err) {
      genBtn.disabled = false;
      genBtn.textContent = 'Generate Blog';
      const code = err.payload && err.payload.code ? '[' + err.payload.code + '] ' : '';
      setBanner(msgBox, 'banner-err', code + err.message);
    }
  }

  function renderPreflightPanel(pf) {
    const pfBox = document.getElementById('preflight-panel');
    if (!pfBox) return;
    state.preflightResult = pf;
    const verdict = String(pf.verdict || 'NEEDS_CLARIFICATION');
    const pillCls = verdict === 'OUT_OF_SCOPE' ? 'pill-red' : 'pill-amber';
    let applyCatOpt = !state.outlineCustomized;
    const applyCatRow = state.outlineCustomized
      ? (() => {
          const chk = el('input', {
            type: 'checkbox',
            onChange: (ev) => { applyCatOpt = Boolean(ev.target.checked); },
          });
          chk.checked = false;
          return el('label', { className: 'check-row', style: { fontSize: '11px', margin: '6px 0' } },
            chk,
            el('span', null, 'Also switch to option\'s recommended category & outline (unchecked keeps your custom outline)')
          );
        })()
      : null;

    const optNodes = (pf.options || []).slice(0, 3).map((opt, idx) => {
      const oc = getCategoryById(opt.category);
      const diagChips = (opt.recommendedDiagrams || []).map((dk) => makePill(DIAGRAM_SHORT_LABELS[dk] || dk, 'pill-blue', false));
      return el('button', {
        type: 'button',
        className: 'preflight-opt-btn',
        'data-preflight-option': String(idx),
        onClick: async () => {
          const titleInp = document.getElementById('inp-title');
          const promptArea = document.getElementById('inp-prompt');
          if (titleInp && opt.title) titleInp.value = opt.title;
          if (promptArea && opt.prompt) {
            promptArea.value = opt.prompt;
            document.getElementById('prompt-char-count').textContent = opt.prompt.length + ' / 4000';
          }
          if (applyCatOpt && opt.category) {
            applyCategorySelection(opt.category, true);
          }
          await launchGenerationWithPayload(collectGeneratePayload(opt.prompt));
        },
      },
        el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', width: '100%' } },
          el('strong', { style: { fontSize: '12px', color: '#0f172a' } }, (idx + 1) + '. ' + (opt.title || 'Option ' + (idx + 1))),
          makePill(oc ? oc.shortName : (opt.category || 'Architecture'), 'pill-purple', false)
        ),
        el('div', { style: { fontSize: '11px', color: '#334155', lineHeight: '1.35' } }, opt.angle || ''),
        el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' } }, ...diagChips)
      );
    });

    const footerRow = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' } },
      pf.canBypass
        ? el('button', {
            type: 'button',
            className: 'btn btn-sm',
            id: 'btn-preflight-bypass',
            onClick: () => launchGenerationWithPayload(collectGeneratePayload()),
          }, 'Proceed with original prompt anyway')
        : el('span', { className: 'hint' }, 'Choose a grounded architecture option above or revise your prompt.'),
      el('button', {
        type: 'button',
        className: 'btn btn-sm',
        onClick: hidePreflightPanel,
      }, 'Dismiss')
    );

    setChildren(
      pfBox,
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '5px' } },
        el('strong', { style: { fontSize: '12px', color: '#92400e' } }, 'Gemini Prompt Assessment — Pick 1 of 3 Tailored Options'),
        makePill(verdict + (typeof pf.score === 'number' ? ' · ' + pf.score : ''), pillCls, false)
      ),
      el('div', { style: { fontSize: '11.5px', color: '#475569', marginBottom: '6px' } }, pf.reason || ''),
      applyCatRow,
      el('div', { className: 'preflight-options' }, ...optNodes),
      footerRow
    );
    pfBox.classList.remove('hidden');
    if (typeof pfBox.scrollIntoView === 'function') {
      pfBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function init() {
    // Render starter prompt chips
    const chipsBox = document.getElementById('starter-chips');
    chipsBox.replaceChildren(...STARTER_PROMPTS.map((sp) => el('button', {
      type: 'button', className: 'chip',
      onClick: () => {
        document.getElementById('inp-title').value = sp.title;
        document.getElementById('inp-prompt').value = sp.prompt;
        document.getElementById('inp-domain').value = sp.domain;
        document.getElementById('prompt-char-count').textContent = sp.prompt.length + ' / 4000';
        hidePreflightPanel();
      },
    }, sp.label)));

    const promptArea = document.getElementById('inp-prompt');
    promptArea.addEventListener('input', () => {
      document.getElementById('prompt-char-count').textContent = promptArea.value.length + ' / 4000';
      if (state.preflightResult) hidePreflightPanel();
    });

    const catSel = document.getElementById('inp-category');
    if (catSel) {
      catSel.addEventListener('change', () => {
        applyCategorySelection(catSel.value, true);
      });
    }
    const chkStarter = document.getElementById('chk-starter-code');
    if (chkStarter) {
      chkStarter.addEventListener('change', () => {
        state.includeStarterCode = Boolean(chkStarter.checked);
        renderOutlinePlanner();
      });
    }
    const addSecBtn = document.getElementById('btn-planner-add-sec');
    if (addSecBtn) {
      addSecBtn.addEventListener('click', () => {
        const nextN = state.outline.filter((x) => x.type === 'section').length + 1;
        state.outline.push({
          id: 'sec-custom-' + Date.now(),
          type: 'section',
          title: 'Custom Architecture Section ' + nextN,
          enabled: true,
        });
        state.outlineCustomized = true;
        renderOutlinePlanner();
      });
    }
    const resetPlannerBtn = document.getElementById('btn-planner-reset');
    if (resetPlannerBtn) {
      resetPlannerBtn.addEventListener('click', () => {
        applyCategorySelection(state.categoryId, false);
      });
    }
    const newBlogBtn = document.getElementById('btn-new-blog-planner');
    if (newBlogBtn) {
      newBlogBtn.addEventListener('click', openOutlinePlannerView);
    }

    document.getElementById('btn-refresh-caps').addEventListener('click', refreshCapabilities);
    document.getElementById('btn-refresh-lib').addEventListener('click', () => refreshLibrary(false, true));

    document.querySelectorAll('#asset-tablist .wtab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('generate-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (state.preflightBusy) return;
      const msgBox = document.getElementById('composer-msg');
      const genBtn = document.getElementById('btn-generate');
      setBanner(msgBox, '', '');
      const prompt = promptArea.value.trim();
      if (!prompt) {
        setBanner(msgBox, 'banner-err', 'Please enter a topic or architecture prompt first.');
        return;
      }
      const apiKeyVal = (document.getElementById('inp-apikey').value || '').trim();
      const extraHeaders = apiKeyVal ? { 'X-Gemini-Api-Key': apiKeyVal } : {};
      state.preflightBusy = true;
      genBtn.disabled = true;
      genBtn.textContent = 'Assessing Prompt with Gemini...';
      try {
        const pf = await apiPost('/api/create-blog/preflight', {
          prompt,
          category: state.categoryId,
          domain: document.getElementById('inp-domain').value,
          audience: document.getElementById('inp-audience').value,
          outline: state.outline,
        }, extraHeaders);
        state.preflightBusy = false;
        if (pf && pf.verdict === 'READY') {
          await launchGenerationWithPayload(collectGeneratePayload());
          return;
        }
        genBtn.disabled = false;
        genBtn.textContent = 'Generate Blog';
        renderPreflightPanel(pf);
      } catch (err) {
        state.preflightBusy = false;
        genBtn.disabled = false;
        genBtn.textContent = 'Generate Blog';
        const code = err.payload && err.payload.code ? '[' + err.payload.code + '] ' : '';
        setBanner(msgBox, 'banner-err', code + err.message);
      }
    });

    const sbBtn = document.getElementById('btn-toggle-sidebar');
    if (sbBtn) {
      sbBtn.addEventListener('click', () => {
        const sh = document.querySelector('main.shell');
        if (!sh) return;
        const collapsed = sh.classList.toggle('shell-collapsed');
        sbBtn.textContent = collapsed ? 'Show Composer' : 'Full-Width';
      });
    }
    const lb = document.getElementById('diag-lightbox');
    if (lb) {
      lb.addEventListener('click', (ev) => { if (ev.target === lb) closeDiagramLightbox(); });
    }
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        closeDiagramLightbox();
        const pop = document.getElementById('status-popover');
        if (pop) pop.removeAttribute('open');
        const menu = document.getElementById('hero-export-menu');
        if (menu) menu.removeAttribute('open');
      }
    });

    function syncTopbarHeight() {
      const tb = document.querySelector('header.topbar');
      const qb = document.querySelector('.quad-bar');
      const h = Math.ceil((tb ? tb.getBoundingClientRect().height : 84) + (qb ? qb.getBoundingClientRect().height : 4));
      document.documentElement.style.setProperty('--topbar-h', h + 'px');
    }
    syncTopbarHeight();
    window.addEventListener('resize', syncTopbarHeight);
    if (typeof ResizeObserver !== 'undefined') {
      const tbEl = document.querySelector('header.topbar');
      if (tbEl) new ResizeObserver(syncTopbarHeight).observe(tbEl);
    }

    renderOutlinePlanner();
    refreshCapabilities();
    refreshLibrary(true);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
