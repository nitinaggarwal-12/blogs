/* Create Blog1 Studio Client — Pure Safe DOM (zero unsafe HTML sinks, zero browser secret storage). */
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

  const state = {
    csrfToken: (document.querySelector('meta[name="csrf-token"]') || {}).content || '',
    capabilities: null,
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
    return '/api/create-blog1/blogs/' + encodeURIComponent(slug) + '/asset/' + parts + (q.length ? '?' + q.join('&') : '');
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

  function renderCapabilities(cap) {
    const strip = document.getElementById('capability-strip');
    const authPill = document.getElementById('composer-auth-pill');
    if (!strip || !cap) return;
    const auth = cap.auth || {};
    const c = cap.capabilities || {};
    const items = [];
    items.push(makePill(
      auth.vertexAiIamReady ? 'Vertex AI IAM: LIVE (global + ' + cap.vertexLocation + ')' : 'Vertex AI IAM: Offline',
      auth.vertexAiIamReady ? 'pill-green' : 'pill-amber',
      true
    ));
    if (cap.defaultModel) {
      items.push(makePill('Default: ' + cap.defaultModel, 'pill-blue', false));
    }
    items.push(makePill(
      auth.geminiApiKeyEnvReady ? 'Env API Key: Set' : 'Transient Header Key: Supported',
      auth.geminiApiKeyEnvReady ? 'pill-green' : 'pill-blue',
      false
    ));
    items.push(makePill(
      c.cloudTtsChirp3Hd ? 'Cloud TTS Chirp3-HD: LIVE' : 'Cloud TTS: Offline',
      c.cloudTtsChirp3Hd ? 'pill-green' : 'pill-amber',
      true
    ));
    items.push(makePill(
      c.gcsDurableStorage ? 'GCS Durable Store: Connected' : 'Storage: Local Runtime',
      c.gcsDurableStorage ? 'pill-green' : 'pill-amber',
      true
    ));
    if (c.googleSearchGrounding) items.push(makePill('Search Grounding: LIVE', 'pill-green', true));
    if (c.officialGcpSvgIcons) items.push(makePill(c.officialGcpSvgIcons + ' GCP SVG Icons', 'pill-blue', false));
    items.push(makePill('6 WS1-Parity Diagrams + Google Slides', 'pill-blue', false));
    items.push(makePill(
      c.workspaceOauthSync ? 'Google Slides & Docs: Synced Engine' : 'Google Slides & Docs: 1-Click OAuth',
      c.workspaceOauthSync ? 'pill-green' : 'pill-blue',
      Boolean(c.workspaceOauthSync)
    ));
    items.push(makePill(
      c.hostMp4Compiler ? 'Video Export: Server MP4 + Browser WebM' : 'Video Export: Browser WebM (MediaRecorder)',
      'pill-purple',
      false
    ));
    strip.replaceChildren(...items);

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
      const cap = await apiGet('/api/create-blog1/capabilities');
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
        container.appendChild(el('strong', null, tok.slice(2, -2)));
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

  function buildMarkdownDom(mdText) {
    const root = el('article', { className: 'article-body' });
    const lines = String(mdText || '').replace(/\r\n/g, '\n').split('\n');
    let i = 0;
    while (i < lines.length) {
      const ln = lines[i];
      if (!ln.trim()) { i += 1; continue; }
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
        root.appendChild(el('h3', null, ln.slice(4).trim()));
        i += 1; continue;
      }
      if (ln.startsWith('## ')) {
        root.appendChild(el('h2', null, ln.slice(3).trim()));
        i += 1; continue;
      }
      if (ln.startsWith('# ')) {
        root.appendChild(el('h1', null, ln.slice(2).trim()));
        i += 1; continue;
      }
      if (ln.startsWith('> ')) {
        const bq = el('blockquote');
        const qLines = [];
        while (i < lines.length && lines[i].startsWith('> ')) {
          qLines.push(lines[i].slice(2).trim());
          i += 1;
        }
        renderInlineMarkdown(bq, qLines.join(' '));
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
      const verTag = diagCnt >= 6 ? 'v3 · WS1-Parity' : (diagCnt >= 5 ? 'v2' : 'v1');
      card.appendChild(el('div', { className: 'hint', style: { fontFamily: 'var(--mono)', fontSize: '10.5px', margin: '2px 0 5px', wordBreak: 'break-all' } }, b.slug));
      const wsStatus = (b.workspaceSync && b.workspaceSync.status) || '';
      const isWsSynced = Boolean(wsStatus === 'SYNCED' && b.workspaceSync.slidesUrl && b.workspaceSync.docUrl);
      const isWsStale = Boolean(wsStatus === 'STALE');
      const meta = el('div', { className: 'lib-meta' },
        makePill(verTag + ' (' + diagCnt + 'd/' + slideCnt + 's)', diagCnt >= 6 ? 'pill-green' : (diagCnt >= 5 ? 'pill-purple' : 'pill-amber'), false),
        makePill(b.modelUsed || 'gemini', 'pill-blue', false),
        makePill('Gate ' + (b.qualityPassed || 0) + '/' + (b.qualityTotal || 12), (b.qualityPassed === b.qualityTotal ? 'pill-green' : 'pill-amber'), false),
        makePill('Proofs: ' + (b.proofCount || 0), (b.proofCount > 0 ? 'pill-green' : 'pill-amber'), false),
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
      const res = await apiGet('/api/create-blog1/blogs' + (forceGcs ? '?refresh=1' : ''));
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
      await apiPost('/api/create-blog1/blogs/' + encodeURIComponent(slug) + '/delete', {});
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
      const data = await apiGet('/api/create-blog1/blogs/' + encodeURIComponent(slug));
      state.activeSlug = slug;
      state.activeBlog = data;
      state.activeSlide = 1;
      state.playerSlide = 1;
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
    const badges = [
      makePill(blog.domain || 'Architecture', 'pill-blue', false),
      makePill('Model: ' + (blog.generation ? blog.generation.model : ''), 'pill-purple', false),
      makePill('Auth: ' + (blog.generation ? blog.generation.authMode : ''), 'pill-green', true),
      makePill('Gate ' + (det.passed || 0) + '/' + (det.total || 12), det.allPassed ? 'pill-green' : 'pill-amber', false),
    ];
    if (judge && judge.verdict && judge.verdict !== 'SKIPPED') {
      badges.push(makePill(
        'Judge: ' + judge.verdict + (judge.score !== null && judge.score !== undefined ? ' (' + judge.score + '/100)' : ''),
        judge.verdict === 'APPROVED' ? 'pill-green' : 'pill-amber',
        false
      ));
    }
    const proofCount = (blog.proofs || []).length;
    badges.push(makePill(
      proofCount > 0 ? proofCount + ' Verified Proof' + (proofCount === 1 ? '' : 's') : '0 Proofs (Awaiting Live Capture)',
      proofCount > 0 ? 'pill-green' : 'pill-amber',
      false
    ));
    const ws = blog.workspaceSync || {};
    const isSynced = ws.status === 'SYNCED' && isSafeHref(ws.slidesUrl) && isSafeHref(ws.docUrl);
    const isStale = ws.status === 'STALE';
    if (isSynced) {
      const syncedShort = ws.syncedAt ? ' · ' + String(ws.syncedAt).slice(0, 16).replace('T', ' ') + 'Z' : '';
      badges.push(makePill('Google Slides & Docs Synced' + syncedShort, 'pill-green', true));
    } else if (isStale) {
      badges.push(makePill('Workspace Sync Stale — Re-sync Needed', 'pill-amber', true));
    }
    document.getElementById('hero-badges').replaceChildren(...badges);
    document.getElementById('hero-title').textContent = blog.title || slug;
    document.getElementById('hero-sub').textContent = blog.subtitle || '';

    const a = blog.assets || {};
    const slideCount = ((blog.blueprint && blog.blueprint.slides) || []).length || 12;

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
          title: 'Sync & open native editable ' + slideCount + '-slide presentation in Google Slides (no .pptx download)',
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
          title: 'Sync & open native editable architecture brief in Google Docs (no .docx download)',
          onClick: () => openInGoogleWorkspace(slug, 'docs'),
        }, makeSvgBadgeIcon('docs'), 'Open with Google Docs');

    const btns = [
      openSlidesBtn,
      openDocsBtn,
      el('button', {
        type: 'button',
        className: 'btn btn-sm',
        id: 'btn-view-blogmd',
        onClick: () => switchTab('reader'),
      }, 'View blog.md'),
      el('a', { className: 'btn btn-sm', href: assetUrl(slug, a.starterZip, true) }, 'Starter Code (.zip)'),
      el('a', { className: 'btn btn-primary btn-sm', href: assetUrl(slug, a.bundleZip, true) }, 'Full Bundle (.zip)'),
      el('button', {
        type: 'button',
        className: 'btn btn-sm',
        id: 'btn-sync-workspace',
        title: isSynced ? 'Update the live Google Slides & Google Docs files in place' : 'Convert and publish to Google Slides & Google Docs',
        onClick: () => triggerWorkspaceSync(slug),
      }, isSynced ? 'Re-sync Slides & Docs' : 'Sync to Google Workspace'),
    ];
    document.getElementById('hero-actions').replaceChildren(...btns);

    const syncBanner = document.getElementById('workspace-sync-banner');
    if (isStale) {
      syncBanner.className = 'banner banner-warn';
      syncBanner.replaceChildren(
        el('strong', null, 'Workspace Deck & Doc Out of Sync: '),
        (ws.staleReason || 'Proofs changed after the last Workspace sync.') + ' Click "Re-sync Slides & Docs" above to update Google Slides and Google Docs in place.'
      );
    } else {
      syncBanner.className = 'banner hidden';
      syncBanner.textContent = '';
    }
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

  async function triggerWorkspaceSync(slug, openMode) {
    if (state.workspaceSyncBusy) return null;
    state.workspaceSyncBusy = true;
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
      let res;
      try {
        res = await apiPost('/api/create-blog1/blogs/' + encodeURIComponent(slug) + '/sync-workspace', {}, extraHdrs);
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
            '/api/create-blog1/blogs/' + encodeURIComponent(slug) + '/sync-workspace',
            {},
            { 'X-Google-Workspace-Token': accessTok }
          );
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
        syncBtn.textContent = syncedNow ? 'Re-sync Slides & Docs' : 'Sync to Google Workspace';
      }
      if (slidesBtn && slidesBtn.tagName === 'BUTTON') slidesBtn.disabled = false;
      if (docsBtn && docsBtn.tagName === 'BUTTON') docsBtn.disabled = false;
    }
  }

  function switchTab(tabKey) {
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
    const order = [
      { key: 'architecture', defLabel: 'Figure 1 — Master Platform Architecture (C4 L2)' },
      { key: 'cloudarch', defLabel: 'Figure 2 — Cloud Architecture Center Blueprint (Hub-and-Spoke)' },
      { key: 'sequence', defLabel: 'Figure 3 — Request Lifecycle Sequence (C4 L3)' },
      { key: 'security', defLabel: 'Figure 4 — Trust Perimeter & Security Boundary (C4 L1)' },
      { key: 'wire', defLabel: 'Figure 5 — Wire-Protocol & Schema Transformation (C4 L4)' },
      { key: 'async', defLabel: 'Figure 6 — Async State, Export & Lifecycle Loop' },
    ];
    return order.filter((o) => Boolean(dmap[o.key])).map((o) => ({ key: o.key, label: dmap[o.key].title || o.defLabel, diag: dmap[o.key] }));
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
    const arch = blog.diagrams && blog.diagrams.architecture;
    const seq = blog.diagrams && blog.diagrams.sequence;
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
    const topBar = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' } },
      el('span', { className: 'pill pill-blue' }, 'Google Cloud Architecture Center Format'),
      (() => {
        const ws = blog.workspaceSync || {};
        const docBtn = (ws.status === 'SYNCED' && isSafeHref(ws.docUrl))
          ? el('a', { className: 'btn btn-gdocs btn-sm', href: ws.docUrl, target: '_blank', rel: 'noopener noreferrer' }, makeSvgBadgeIcon('docs'), 'Open with Google Docs')
          : el('button', { type: 'button', className: 'btn btn-gdocs btn-sm', onClick: () => openInGoogleWorkspace(slug, 'docs') }, makeSvgBadgeIcon('docs'), 'Open with Google Docs');
        return el('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap' } },
          docBtn,
          copyBtn
        );
      })()
    );
    const diagEntries = getDiagramEntries(blog);
    const figBox = el('div', { className: 'reader-fig-grid' });
    diagEntries.forEach((ent) => {
      figBox.appendChild(el('div', { className: 'diagram-card', style: { marginBottom: '0' } },
        el('div', { className: 'diagram-hdr' },
          el('strong', { style: { fontSize: '11.5px', lineHeight: '1.3' } }, ent.label),
          el('a', { className: 'btn btn-sm', href: ent.diag.viewerUrl, target: '_blank', rel: 'noopener noreferrer' }, 'viewer ->')
        ),
        el('div', { className: 'diagram-stage' }, el('img', {
          src: assetUrl(slug, ent.diag.svgPath),
          alt: ent.diag.title,
          title: 'Click to maximize',
          onClick: () => openDiagramLightbox(slug, ent.label, ent.diag),
        }))
      ));
    });
    // Strip duplicate H1/subtitle metadata header & redundant Figures table in Reader view
    // (Hero card + interactive 3x2 Figure grid above already present them; Copy Raw Markdown keeps full file).
    let readerMd = String(blog.markdownText || '').replace(/\r\n/g, '\n');
    const execIdx = readerMd.indexOf('## Executive Summary');
    if (execIdx > 0) readerMd = readerMd.slice(execIdx);
    readerMd = readerMd.replace(/\n## Figures & Editable C4 Diagrams[\s\S]*?(?=\n## )/m, '\n');
    panel.replaceChildren(topBar, figBox, buildMarkdownDom(readerMd));
  }

  function openDiagramLightbox(slug, label, diag) {
    const modal = document.getElementById('diag-lightbox');
    if (!modal) return;
    const t = document.getElementById('diag-lightbox-title');
    const acts = document.getElementById('diag-lightbox-actions');
    const body = document.getElementById('diag-lightbox-body');
    if (t) t.textContent = label;
    if (acts) {
      acts.replaceChildren(
        el('a', { className: 'btn btn-primary btn-sm', href: diag.viewerUrl, target: '_blank', rel: 'noopener noreferrer' }, 'viewer.diagrams.net ->'),
        el('a', { className: 'btn btn-sm', href: diag.studioUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Edit in Studio'),
        el('a', { className: 'btn btn-sm', href: assetUrl(slug, diag.drawioPath, true) }, 'Download .drawio'),
        el('a', { className: 'btn btn-sm', href: assetUrl(slug, diag.svgPath, true) }, 'Download .svg'),
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
      btns.push(
        el('a', { className: 'btn btn-sm', href: assetUrl(slug, diag.drawioPath, true) }, 'Download .drawio'),
        el('a', { className: 'btn btn-sm', href: assetUrl(slug, diag.svgPath, true) }, 'Download .svg')
      );
      if (diag.refImagePath) {
        btns.push(el('a', { className: 'btn btn-sm', href: assetUrl(slug, diag.refImagePath, true) }, 'Ref PNG'));
      }
      return el('div', { className: 'diagram-card' },
        el('div', { className: 'diagram-hdr' },
          el('div', null,
            el('strong', { style: { fontSize: '13.5px' } }, ent.label),
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

    const navBar = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' } },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
        el('button', {
          type: 'button', className: 'btn btn-sm', disabled: n <= 1,
          onClick: () => { state.activeSlide = Math.max(1, n - 1); renderSlidesTab(blog); },
        }, '<- Prev'),
        el('strong', { style: { fontSize: '13.5px' } }, 'Slide ' + n + ' / ' + getSlideCount(blog) + ': ' + (cur.title || '')),
        el('button', {
          type: 'button', className: 'btn btn-sm', disabled: n >= getSlideCount(blog),
          onClick: () => { state.activeSlide = Math.min(getSlideCount(blog), n + 1); renderSlidesTab(blog); },
        }, 'Next ->')
      ),
      (() => {
        const ws = blog.workspaceSync || {};
        const isWs = ws.status === 'SYNCED' && isSafeHref(ws.slidesUrl);
        return el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          isWs
            ? el('a', { className: 'btn btn-gslides btn-sm', href: ws.slidesUrl, target: '_blank', rel: 'noopener noreferrer' }, makeSvgBadgeIcon('slides'), 'Open with Google Slides (' + getSlideCount(blog) + ' Slides)')
            : el('button', { type: 'button', className: 'btn btn-gslides btn-sm', onClick: () => openInGoogleWorkspace(slug, 'slides') }, makeSvgBadgeIcon('slides'), 'Open with Google Slides (' + getSlideCount(blog) + ' Slides)'),
          el('button', { type: 'button', className: 'btn btn-sm', onClick: () => triggerWorkspaceSync(slug) }, isWs ? 'Re-sync Slides & Docs' : 'Sync to Google Workspace')
        );
      })()
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
        onClick: () => { state.activeSlide = i; renderSlidesTab(blog); },
      }, el('img', { src: assetUrl(slug, tRel), alt: 'Slide ' + i }), el('span', null, 'S' + String(i).padStart(2, '0'))));
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

    panel.replaceChildren(disclosure, stage, caption, controls, exportStatus, exportDl, chapRow, extraErr);
  }

  function renderProofsTab(blog) {
    const panel = document.getElementById('panel-proofs');
    const slug = blog.slug;
    const proofs = blog.proofs || [];

    const proofSlideNum = getSlideCount(blog) >= 12 ? 10 : 7;
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
          await apiPost('/api/create-blog1/blogs/' + encodeURIComponent(slug) + '/proofs', {
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
                      await apiPost('/api/create-blog1/blogs/' + encodeURIComponent(slug) + '/proofs/delete', { proofId: pf.id });
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

    const hdr = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' } },
      astPill,
      el('div', { style: { display: 'flex', gap: '7px' } },
        copyBtn,
        el('a', { className: 'btn btn-primary btn-sm', href: assetUrl(blog.slug, blog.assets.starterZip, true) }, 'Download starter.zip')
      )
    );

    const tabs = el('div', { className: 'file-tabs' },
      keys.map((k) => el('button', {
        type: 'button',
        className: 'file-tab' + (k === curKey ? ' active' : ''),
        onClick: () => { state.activeCodeFile = k; renderCodeTab(blog); },
      }, k))
    );
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
          el('td', { style: { fontFamily: 'var(--mono)', fontWeight: '700' } }, c.id),
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
        el('h3', { style: { fontSize: '15px', fontWeight: '800' } }, '2. Orthogonal Gemini Judge Critic'),
        makePill(judge.verdict || 'UNRUN', judge.verdict === 'APPROVED' ? 'pill-green' : 'pill-amber', false),
        judge.orthogonalPair ? makePill(judge.orthogonalPair, 'pill-purple', false) : null,
        judge.searchGrounded ? makePill('Search-Grounded (' + (judge.searchQueries || []).length + ' queries)', 'pill-green', true) : null
      ),
      el('p', { style: { fontSize: '13px', color: '#334155' } }, judge.summary || 'Not executed.')
    );
    topFlex.appendChild(jInfo);
    judgeCard.appendChild(topFlex);

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
      const res = await apiGet('/api/create-blog1/jobs/' + encodeURIComponent(jobId));
      state.pollErrorCount = 0;
      const job = res.job || res;
      renderJobProgress(job);
      if (job.status === 'COMPLETED') {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
        document.getElementById('btn-generate').disabled = false;
        document.getElementById('btn-generate').textContent = 'Generate Complete Blog & Asset Kit';
        setBanner(document.getElementById('composer-msg'), 'banner-ok', 'Generated "' + (job.title || job.slug) + '". Ready for review & download.');
        await refreshLibrary(false, true);
        if (job.slug) await selectBlog(job.slug);
      } else if (job.status === 'FAILED') {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
        document.getElementById('btn-generate').disabled = false;
        document.getElementById('btn-generate').textContent = 'Generate Complete Blog & Asset Kit';
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
      document.getElementById('btn-generate').textContent = 'Generate Complete Blog & Asset Kit';
      setBanner(document.getElementById('composer-msg'), 'banner-err', 'Job polling error: ' + err.message);
    } finally {
      state.pollInFlight = false;
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
      },
    }, sp.label)));

    const promptArea = document.getElementById('inp-prompt');
    promptArea.addEventListener('input', () => {
      document.getElementById('prompt-char-count').textContent = promptArea.value.length + ' / 4000';
    });

    document.getElementById('btn-refresh-caps').addEventListener('click', refreshCapabilities);
    document.getElementById('btn-refresh-lib').addEventListener('click', () => refreshLibrary(false, true));

    document.querySelectorAll('#asset-tablist .wtab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('generate-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const msgBox = document.getElementById('composer-msg');
      const genBtn = document.getElementById('btn-generate');
      setBanner(msgBox, '', '');
      const prompt = promptArea.value.trim();
      if (prompt.length < 12) {
        setBanner(msgBox, 'banner-err', 'Please enter at least 12 characters describing the target architecture.');
        return;
      }
      const apiKeyVal = (document.getElementById('inp-apikey').value || '').trim();
      const extraHeaders = apiKeyVal ? { 'X-Gemini-Api-Key': apiKeyVal } : {};
      genBtn.disabled = true;
      genBtn.textContent = 'Running Live Pipeline...';
      try {
        const res = await apiPost('/api/create-blog1/generate', {
          titleHint: document.getElementById('inp-title').value.trim(),
          prompt,
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
        }, extraHeaders);
        // Immediately wipe input field after transient header transmission so key does not sit in DOM
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
        genBtn.textContent = 'Generate Complete Blog & Asset Kit';
        const code = err.payload && err.payload.code ? '[' + err.payload.code + '] ' : '';
        setBanner(msgBox, 'banner-err', code + err.message);
      }
    });

    refreshCapabilities();
    refreshLibrary(true);
  }

  document.addEventListener('DOMContentLoaded', init);

    const sbBtn = document.getElementById('btn-toggle-sidebar');
    if (sbBtn) {
      sbBtn.addEventListener('click', () => {
        const sh = document.querySelector('main.shell');
        if (!sh) return;
        const collapsed = sh.classList.toggle('shell-collapsed');
        sbBtn.textContent = collapsed ? 'Show Composer' : 'Full-Width Canvas';
      });
    }
    const lb = document.getElementById('diag-lightbox');
    if (lb) {
      lb.addEventListener('click', (ev) => { if (ev.target === lb) closeDiagramLightbox(); });
    }
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeDiagramLightbox(); });

})();
