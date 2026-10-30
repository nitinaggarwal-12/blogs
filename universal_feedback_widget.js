/**
 * Universal Top-Corner Email Feedback Widget & Admin Feedback Inbox Renderer
 * Tooltip: "Give Feedback to nitinagga@google.com"
 * Strictly zero fake/synthetic data. Executive Light Theme (Rule 54) + Rigid Table Containment (Rule 26).
 */
(function () {
  if (typeof window === 'undefined' || window.__UNIVERSAL_FEEDBACK_INITIALIZED__) return;
  window.__UNIVERSAL_FEEDBACK_INITIALIZED__ = true;

  var INITIAL_PATHNAME = window.location.pathname || '';
  var INITIAL_SEARCH = window.location.search || '';
  var scriptEl = document.currentScript || document.querySelector('script[src*="universal_feedback_widget"]');
  var cfg = window.UNIVERSAL_FEEDBACK_CONFIG || {};
  var APP_ID = (scriptEl && scriptEl.getAttribute('data-app-id')) || cfg.appId || 'workspace-app';
  var APP_NAME = (scriptEl && scriptEl.getAttribute('data-app-name')) || cfg.appName || 'Workspace App';
  var MOUNT_SELECTOR =
    (scriptEl && scriptEl.getAttribute('data-mount-selector')) || cfg.mountSelector || '';

  var CATEGORIES = [
    'Bug / Blocker',
    'Feature Request',
    'UI / UX Polish',
    'Data / Grounding',
    'General',
  ];
  var PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
  var STATUSES = ['New', 'Triaged', 'In Progress', 'Resolved'];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function injectStyles() {
    if (document.getElementById('ufw-styles')) return;
    var style = document.createElement('style');
    style.id = 'ufw-styles';
    style.textContent = [
      '.ufw-btn-wrap { position: relative; display: inline-flex; align-items: center; font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif; }',
      '.ufw-email-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 32px; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; background: #eff6ff; color: #1e40af; border: 1px solid #93c5fd; cursor: pointer; white-space: nowrap; transition: background 0.15s ease; box-shadow: 0 1px 2px rgba(15,23,42,0.05); }',
      '.ufw-email-btn:hover { background: #dbeafe; }',
      '.ufw-tooltip { position: absolute; right: 0; top: calc(100% + 6px); z-index: 2147483645; background: #0f172a; color: #ffffff; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); border: 1px solid #334155; pointer-events: none; display: none; }',
      '.ufw-btn-wrap:hover .ufw-tooltip, .ufw-btn-wrap:focus-within .ufw-tooltip { display: block; }',
      '.ufw-backdrop { position: fixed; inset: 0; z-index: 2147483640; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif; }',
      '.ufw-modal { width: 100%; max-width: 672px; background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25); overflow: hidden; }',
      '.ufw-modal-hdr { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }',
      '.ufw-modal-body { padding: 20px; max-height: 80vh; overflow-y: auto; }',
      '.ufw-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }',
      '@media (max-width: 600px) { .ufw-grid-2 { grid-template-columns: 1fr; } }',
      '.ufw-label { display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 4px; }',
      '.ufw-input, .ufw-select, .ufw-textarea { width: 100%; box-sizing: border-box; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; padding: 8px 12px; font-size: 12px; color: #0f172a; font-family: inherit; }',
      '.ufw-input:focus, .ufw-select:focus, .ufw-textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }',
      '.ufw-admin-overlay { position: fixed; inset: 0; z-index: 2147483635; background: #f8fafc; color: #0f172a; overflow-y: auto; padding: 20px 24px; font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", Roboto, sans-serif; box-sizing: border-box; }',
      '.ufw-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }',
      '.ufw-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }',
      '@media (max-width: 900px) { .ufw-kpi-grid { grid-template-columns: repeat(2, 1fr); } }',
      '.ufw-table { width: 100%; table-layout: fixed; border-collapse: collapse; text-align: left; font-size: 12px; }',
      '.ufw-table th { background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 11px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #334155; }',
      '.ufw-table td { border-bottom: 1px solid #e2e8f0; padding: 12px 14px; vertical-align: top; overflow: hidden; max-width: 0; word-break: break-word; }',
      '@media (max-width: 767px) { .ufw-email-btn { min-height: 36px; } .ufw-backdrop { padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom)) 10px; } .ufw-modal-hdr { flex-wrap: wrap; padding: 12px 14px; } .ufw-modal-body { padding: 14px; max-height: 82dvh; } .ufw-input, .ufw-select, .ufw-textarea { font-size: 16px !important; } .ufw-admin-overlay { padding: max(14px, env(safe-area-inset-top)) 12px max(20px, env(safe-area-inset-bottom)) 12px; } .ufw-card { overflow-x: auto; -webkit-overflow-scrolling: touch; } .ufw-table { min-width: 680px; } }',
    ].join('\n');
    document.head.appendChild(style);
  }

  function getCurrentRoute() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function openFeedbackModal() {
    injectStyles();
    var existing = document.querySelector('[data-testid="give-feedback-modal-backdrop"]');
    if (existing) existing.remove();

    var route = getCurrentRoute();
    var backdrop = document.createElement('div');
    backdrop.className = 'ufw-backdrop';
    backdrop.setAttribute('data-testid', 'give-feedback-modal-backdrop');
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) backdrop.remove();
    });

    backdrop.innerHTML =
      '<div role="dialog" aria-modal="true" aria-labelledby="give-feedback-modal-title" data-testid="give-feedback-modal" class="ufw-modal">' +
      '  <div class="ufw-modal-hdr">' +
      '    <div style="display:flex;align-items:center;gap:10px;min-width:0;">' +
      '      <div style="width:36px;height:36px;border-radius:10px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
      '        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>' +
      '      </div>' +
      '      <div style="min-width:0;">' +
      '        <h2 id="give-feedback-modal-title" style="margin:0;font-size:16px;font-weight:800;color:#0f172a;line-height:1.3;">Give Feedback to nitinagga@google.com</h2>' +
      '        <p style="margin:2px 0 0;font-size:12px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">App: <strong style="color:#0f172a;">' +
      escapeHtml(APP_NAME) +
      '</strong> · Route: <code style="font-family:monospace;font-size:11px;background:#e2e8f0;padding:1px 5px;border-radius:4px;">' +
      escapeHtml(route) +
      '</code></p>' +
      '      </div>' +
      '    </div>' +
      '    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">' +
      '      <button type="button" data-testid="feedback-open-admin-page-btn" id="ufw-open-admin-btn" style="padding:6px 10px;border-radius:8px;font-size:12px;font-weight:800;background:#ffffff;color:#1d4ed8;border:1px solid #cbd5e1;cursor:pointer;white-space:nowrap;">🔒 Admin Inbox ↗</button>' +
      '      <button type="button" data-testid="give-feedback-modal-close-btn" id="ufw-close-modal-btn" aria-label="Close Feedback Modal" style="width:32px;height:32px;border-radius:8px;background:#ffffff;color:#475569;border:1px solid #e2e8f0;font-weight:700;cursor:pointer;">✕</button>' +
      '    </div>' +
      '  </div>' +
      '  <div class="ufw-modal-body" id="ufw-modal-body-container">' +
      '    <form id="ufw-feedback-form">' +
      '      <div id="ufw-error-banner" style="display:none;margin-bottom:12px;padding:10px 12px;border-radius:8px;background:#fff1f2;border:1px solid #fda4af;color:#881337;font-size:12px;font-weight:700;"></div>' +
      '      <div class="ufw-grid-2">' +
      '        <div>' +
      '          <label class="ufw-label" for="ufw-category">Feedback Category</label>' +
      '          <select id="ufw-category" data-testid="feedback-category-select" class="ufw-select" style="font-weight:700;">' +
      CATEGORIES.map(function (c) {
        return '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
      }).join('') +
      '          </select>' +
      '        </div>' +
      '        <div>' +
      '          <label class="ufw-label" for="ufw-priority">Priority Level</label>' +
      '          <select id="ufw-priority" data-testid="feedback-priority-select" class="ufw-select" style="font-weight:700;">' +
      PRIORITIES.map(function (p) {
        return (
          '<option value="' +
          escapeHtml(p) +
          '"' +
          (p === 'Medium' ? ' selected' : '') +
          '>' +
          escapeHtml(p) +
          '</option>'
        );
      }).join('') +
      '          </select>' +
      '        </div>' +
      '      </div>' +
      '      <div class="ufw-grid-2">' +
      '        <div>' +
      '          <label class="ufw-label" for="ufw-sender-name">Your Name (Optional)</label>' +
      '          <input id="ufw-sender-name" type="text" data-testid="feedback-sender-name-input" class="ufw-input" value="' +
      escapeHtml(
        cfg.defaultSenderName ||
          (function () {
            try {
              return localStorage.getItem('ufw_last_sender_name') || '';
            } catch (_) {
              return '';
            }
          })()
      ) +
      '" placeholder="e.g., Jane Doe" />' +
      '        </div>' +
      '        <div>' +
      '          <label class="ufw-label" for="ufw-sender-email">Your Email (Optional)</label>' +
      '          <input id="ufw-sender-email" type="email" data-testid="feedback-sender-email-input" class="ufw-input" value="' +
      escapeHtml(
        cfg.defaultSenderEmail ||
          (function () {
            try {
              return localStorage.getItem('ufw_last_sender_email') || '';
            } catch (_) {
              return '';
            }
          })()
      ) +
      '" placeholder="user@google.com" />' +
      '        </div>' +
      '      </div>' +
      '      <div style="margin-bottom:14px;">' +
      '        <label class="ufw-label" for="ufw-message">Feedback Message for <span style="color:#1d4ed8;">nitinagga@google.com</span> *</label>' +
      '        <textarea id="ufw-message" data-testid="feedback-message-textarea" class="ufw-textarea" rows="4" required placeholder="Describe what worked well, what needs fixing, or what feature you would like added..."></textarea>' +
      '      </div>' +
      '      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding-top:12px;border-top:1px solid #e2e8f0;">' +
      '        <span style="font-size:11px;color:#64748b;">Persists to Unified Cross-App Feedback Ledger &amp; Admin Inbox</span>' +
      '        <div style="display:flex;align-items:center;gap:8px;">' +
      '          <button type="button" id="ufw-cancel-btn" style="padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700;background:#f1f5f9;color:#334155;border:none;cursor:pointer;">Cancel</button>' +
      '          <button type="submit" id="ufw-submit-btn" data-testid="feedback-submit-btn" style="padding:8px 16px;border-radius:8px;font-size:12px;font-weight:800;background:#2563eb;color:#ffffff;border:none;cursor:pointer;">Submit Feedback</button>' +
      '        </div>' +
      '      </div>' +
      '    </form>' +
      '  </div>' +
      '</div>';

    document.body.appendChild(backdrop);

    document.getElementById('ufw-close-modal-btn').onclick = function () {
      backdrop.remove();
    };
    document.getElementById('ufw-cancel-btn').onclick = function () {
      backdrop.remove();
    };
    document.getElementById('ufw-open-admin-btn').onclick = function () {
      backdrop.remove();
      openAdminInboxPage();
    };

    var form = document.getElementById('ufw-feedback-form');
    var isSubmitting = false;
    function submitFeedbackForm(e) {
      if (e && e.preventDefault) e.preventDefault();
      if (isSubmitting) return;
      var msgEl = document.getElementById('ufw-message');
      var message = (msgEl.value || '').trim();
      var errBanner = document.getElementById('ufw-error-banner');
      if (!message) {
        errBanner.style.display = 'block';
        errBanner.textContent = '⚠️ Please enter a feedback message before submitting.';
        return;
      }
      isSubmitting = true;
      var submitBtn = document.getElementById('ufw-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      errBanner.style.display = 'none';

      var cleanSenderName = document.getElementById('ufw-sender-name').value.trim();
      var cleanSenderEmail = document.getElementById('ufw-sender-email').value.trim();
      try {
        if (cleanSenderName) localStorage.setItem('ufw_last_sender_name', cleanSenderName);
        if (cleanSenderEmail) localStorage.setItem('ufw_last_sender_email', cleanSenderEmail);
      } catch (_) {}

      fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: APP_ID,
          appName: APP_NAME,
          pageUrl: getCurrentRoute(),
          category: document.getElementById('ufw-category').value,
          priority: document.getElementById('ufw-priority').value,
          senderName: cleanSenderName,
          senderEmail: cleanSenderEmail,
          message: message,
          contextMeta: {
            url: window.location.href,
            viewport: window.innerWidth + 'x' + window.innerHeight,
          },
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) {
            return { ok: r.ok, status: r.status, data: d };
          });
        })
        .then(function (res) {
          if (!res.ok || !res.data.ok) {
            throw new Error(res.data.error || 'Submission failed (' + res.status + ')');
          }
          var fb = res.data.feedback;
          var del = res.data.delivery || {};
          var container = document.getElementById('ufw-modal-body-container');
          container.innerHTML =
            '<div data-testid="feedback-submit-success" style="border-radius:12px;background:#ecfdf5;border:1px solid #6ee7b7;padding:16px;">' +
            '  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">' +
            '    <div>' +
            '      <div style="font-size:14px;font-weight:800;color:#064e3b;">✅ Feedback Recorded &amp; Synced (' +
            escapeHtml(fb.id) +
            ')</div>' +
            '      <div style="font-size:12px;color:#065f46;margin-top:2px;">Submitted at ' +
            escapeHtml(fb.timestampEst) +
            ' for <strong>' +
            escapeHtml(fb.appName) +
            '</strong></div>' +
            '    </div>' +
            '    <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-family:monospace;font-weight:700;background:#a7f3d0;color:#064e3b;">' +
            escapeHtml(fb.priority) +
            ' · ' +
            escapeHtml(fb.category) +
            '</span>' +
            '  </div>' +
            '  <div style="font-size:12px;background:#ffffff;border-radius:8px;padding:12px;border:1px solid #a7f3d0;color:#1e293b;white-space:pre-wrap;margin-bottom:10px;">' +
            escapeHtml(fb.message) +
            '</div>' +
            '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;color:#334155;background:rgba(255,255,255,0.85);padding:10px;border-radius:8px;border:1px solid #a7f3d0;margin-bottom:12px;">' +
            '    <div>• Local &amp; Cross-App Store: <strong style="color:#065f46;">Saved</strong></div>' +
            '    <div>• Live Google Sheet Ledger: <strong style="color:#065f46;">' +
            (del.persistedToGoogleSheet ? 'Synced Live' : 'Local Only') +
            '</strong></div>' +
            '  </div>' +
            '  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">' +
            '    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">' +
            '      <button type="button" data-testid="feedback-success-view-admin-btn" id="ufw-success-admin-btn" style="padding:7px 12px;border-radius:8px;font-size:12px;font-weight:800;background:#2563eb;color:#ffffff;border:none;cursor:pointer;">View All Messages on Admin Page →</button>' +
            '      <a href="' +
            escapeHtml(del.gmailComposeUrl || '#') +
            '" target="_blank" rel="noopener noreferrer" data-testid="feedback-success-gmail-btn" style="padding:7px 12px;border-radius:8px;font-size:12px;font-weight:700;background:#ffffff;color:#1e293b;border:1px solid #cbd5e1;text-decoration:none;">✉️ Open in Gmail Compose ↗</a>' +
            '    </div>' +
            '  </div>' +
            '</div>';

          var viewAdminBtn = document.getElementById('ufw-success-admin-btn');
          if (viewAdminBtn) {
            viewAdminBtn.onclick = function () {
              backdrop.remove();
              openAdminInboxPage();
            };
          }
        })
        .catch(function (err) {
          isSubmitting = false;
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Feedback';
          errBanner.style.display = 'block';
          errBanner.textContent = '⚠️ ' + (err.message || 'Failed to submit feedback');
        });
    }
    form.onsubmit = submitFeedbackForm;
    document.getElementById('ufw-submit-btn').onclick = submitFeedbackForm;
  }

  var adminState = {
    scope: 'all',
    category: 'All',
    priority: 'All',
    status: 'All',
    search: '',
  };

  function openAdminInboxPage() {
    injectStyles();
    if (window.location.pathname !== '/admin/feedback') {
      try {
        var nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('page', 'admin-feedback');
        window.history.pushState({}, '', nextUrl.toString());
      } catch (_) {}
    }

    var overlay = document.getElementById('ufw-admin-inbox-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ufw-admin-inbox-overlay';
      overlay.className = 'ufw-admin-overlay';
      overlay.setAttribute('data-testid', 'admin-feedback-inbox-page');
      document.body.appendChild(overlay);
    }
    renderAdminInbox(overlay, false);
  }

  function renderAdminInbox(overlay, forceRefresh) {
    var params = new URLSearchParams({
      scope: adminState.scope,
      category: adminState.category === 'All' ? '' : adminState.category,
      priority: adminState.priority === 'All' ? '' : adminState.priority,
      status: adminState.status === 'All' ? '' : adminState.status,
      search: adminState.search,
      force: forceRefresh ? '1' : '0',
    });

    fetch('/api/feedback/messages?' + params.toString(), {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    })
      .then(function (r) {
        return r.json().then(function (d) {
          return { status: r.status, ok: r.ok, data: d || {} };
        });
      })
      .then(function (res) {
        var data = res.data || {};
        if (res.status === 401 || res.status === 403 || data.ok === false || data.authorized === false) {
          overlay.innerHTML =
            '<div class="ufw-card" style="max-width:640px;margin:48px auto;padding:28px;border:1px solid #fda4af;background:#fff1f2;">' +
            '  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">' +
            '    <h1 style="margin:0;font-size:18px;font-weight:800;color:#881337;">🔒 Admin Access Restricted (HTTP ' +
            escapeHtml(res.status || 403) +
            ')</h1>' +
            '    <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-family:monospace;font-weight:700;background:#ffe4e6;color:#9f1239;border:1px solid #fda4af;">Unauthorized (' +
            escapeHtml(data.authMode || 'denied') +
            ')</span>' +
            '  </div>' +
            '  <p style="margin:0 0 16px;font-size:13px;color:#9f1239;line-height:1.5;">' +
            escapeHtml(
              data.error ||
                'Only nitinagga@google.com is authorized to view the cross-app Admin Feedback Inbox.'
            ) +
            '</p>' +
            '  <button type="button" id="ufw-admin-denied-back-btn" style="padding:8px 14px;border-radius:8px;font-size:12px;font-weight:800;background:#ffffff;color:#1e293b;border:1px solid #cbd5e1;cursor:pointer;">← Back to ' +
            escapeHtml(APP_NAME) +
            '</button>' +
            '</div>';
          var deniedBackBtn = document.getElementById('ufw-admin-denied-back-btn');
          if (deniedBackBtn) {
            deniedBackBtn.onclick = function () {
              overlay.remove();
            };
          }
          return;
        }
        var messages = Array.isArray(data.messages) ? data.messages : [];
        var totalAll = Number(data.totalAllApps || 0);
        var totalApp = Number(data.totalCurrentApp || 0);
        var openCount = messages.filter(function (m) {
          return m.status === 'New' || m.status === 'Triaged';
        }).length;
        var highCritCount = messages.filter(function (m) {
          return m.priority === 'High' || m.priority === 'Critical';
        }).length;
        var sheetUrl =
          data.spreadsheetUrl ||
          'https://docs.google.com/spreadsheets/d/1iPv52nblJISD7WNeEe3m4VovG_JS1qh79MYftMxrnhY/edit';
        var authMode = data.authMode || 'localhost_dev_session';

        overlay.innerHTML =
          '<div class="ufw-card" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">' +
          '  <div style="display:flex;align-items:center;gap:12px;min-width:0;">' +
          '    <button type="button" data-testid="admin-feedback-back-btn" id="ufw-admin-back-btn" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:800;background:#f1f5f9;color:#1e293b;border:1px solid #cbd5e1;cursor:pointer;white-space:nowrap;">← Back to ' +
          escapeHtml(APP_NAME) +
          '</button>' +
          '    <div style="min-width:0;">' +
          '      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">' +
          '        <h1 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">Admin Feedback Inbox — nitinagga@google.com</h1>' +
          '        <span style="padding:2px 8px;border-radius:999px;font-size:11px;font-family:monospace;font-weight:700;background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;">🔒 Admin Verified (' +
          escapeHtml(authMode) +
          ')</span>' +
          '      </div>' +
          '      <p style="margin:3px 0 0;font-size:12px;color:#475569;">Real-time user feedback submitted across all workspace apps, reconciled with the live Google Sheet ledger (0 synthetic rows).</p>' +
          '    </div>' +
          '  </div>' +
          '  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">' +
          '    <div style="display:inline-flex;border-radius:8px;border:1px solid #cbd5e1;background:#f1f5f9;padding:2px;">' +
          '      <button type="button" data-testid="admin-feedback-scope-all-btn" id="ufw-scope-all" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:800;border:none;cursor:pointer;' +
          (adminState.scope === 'all'
            ? 'background:#2563eb;color:#ffffff;'
            : 'background:transparent;color:#334155;') +
          '">All Apps (' +
          totalAll +
          ')</button>' +
          '      <button type="button" data-testid="admin-feedback-scope-app-btn" id="ufw-scope-app" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:800;border:none;cursor:pointer;' +
          (adminState.scope === 'app'
            ? 'background:#2563eb;color:#ffffff;'
            : 'background:transparent;color:#334155;') +
          '">' +
          escapeHtml(APP_NAME) +
          ' Only (' +
          totalApp +
          ')</button>' +
          '    </div>' +
          '    <a href="' +
          escapeHtml(sheetUrl) +
          '" target="_blank" rel="noopener noreferrer" data-testid="admin-feedback-sheet-link" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:800;background:#ecfdf5;color:#065f46;border:1px solid #6ee7b7;text-decoration:none;white-space:nowrap;">📊 Live Google Sheet Ledger ↗</a>' +
          '    <button type="button" data-testid="admin-feedback-refresh-btn" id="ufw-admin-refresh-btn" style="padding:6px 12px;border-radius:8px;font-size:12px;font-weight:800;background:#ffffff;color:#1e293b;border:1px solid #cbd5e1;cursor:pointer;">↻ Refresh</button>' +
          '    <button type="button" id="ufw-admin-new-fb-btn" class="ufw-email-btn">✉️ Feedback</button>' +
          '  </div>' +
          '</div>' +
          '<div class="ufw-kpi-grid">' +
          '  <div class="ufw-card"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#64748b;">Total Feedback (All Apps)</div><div style="font-size:24px;font-weight:800;color:#0f172a;margin-top:4px;">' +
          totalAll +
          '</div><div style="font-size:12px;color:#475569;margin-top:2px;">Synced across local JSON &amp; Google Sheets</div></div>' +
          '  <div class="ufw-card"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#1d4ed8;">' +
          escapeHtml(APP_NAME) +
          ' Submissions</div><div style="font-size:24px;font-weight:800;color:#1e3a8a;margin-top:4px;">' +
          totalApp +
          '</div><div style="font-size:12px;color:#475569;margin-top:2px;">App ID: ' +
          escapeHtml(APP_ID) +
          '</div></div>' +
          '  <div class="ufw-card"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#b45309;">Open / Needs Triage</div><div style="font-size:24px;font-weight:800;color:#78350f;margin-top:4px;">' +
          openCount +
          '</div><div style="font-size:12px;color:#475569;margin-top:2px;">Status: New or Triaged</div></div>' +
          '  <div class="ufw-card"><div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#be123c;">High / Critical Priority</div><div style="font-size:24px;font-weight:800;color:#881337;margin-top:4px;">' +
          highCritCount +
          '</div><div style="font-size:12px;color:#475569;margin-top:2px;">Requires immediate attention</div></div>' +
          '</div>' +
          '<div class="ufw-card" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:16px;padding:12px 16px;">' +
          '  <input type="search" id="ufw-admin-search" data-testid="admin-feedback-search-input" value="' +
          escapeHtml(adminState.search) +
          '" placeholder="Search feedback message, ID, sender, route, or app..." class="ufw-input" style="flex:1;min-width:220px;" />' +
          '  <select id="ufw-filter-cat" data-testid="admin-feedback-filter-category" class="ufw-select" style="width:auto;font-weight:700;">' +
          '    <option value="All">All Categories</option>' +
          CATEGORIES.map(function (c) {
            return (
              '<option value="' +
              escapeHtml(c) +
              '"' +
              (adminState.category === c ? ' selected' : '') +
              '>' +
              escapeHtml(c) +
              '</option>'
            );
          }).join('') +
          '  </select>' +
          '  <select id="ufw-filter-pri" data-testid="admin-feedback-filter-priority" class="ufw-select" style="width:auto;font-weight:700;">' +
          '    <option value="All">All Priorities</option>' +
          PRIORITIES.map(function (p) {
            return (
              '<option value="' +
              escapeHtml(p) +
              '"' +
              (adminState.priority === p ? ' selected' : '') +
              '>' +
              escapeHtml(p) +
              '</option>'
            );
          }).join('') +
          '  </select>' +
          '  <select id="ufw-filter-st" data-testid="admin-feedback-filter-status" class="ufw-select" style="width:auto;font-weight:700;">' +
          '    <option value="All">All Statuses</option>' +
          STATUSES.map(function (s) {
            return (
              '<option value="' +
              escapeHtml(s) +
              '"' +
              (adminState.status === s ? ' selected' : '') +
              '>' +
              escapeHtml(s) +
              '</option>'
            );
          }).join('') +
          '  </select>' +
          '</div>' +
          '<div class="ufw-card" style="padding:0;overflow:hidden;">' +
          (messages.length === 0
            ? '<div data-testid="admin-feedback-empty-state" style="padding:40px;text-align:center;"><div style="font-size:14px;font-weight:800;color:#1e293b;">0 Feedback Messages Match Current View</div><p style="font-size:12px;color:#64748b;max-width:420px;margin:6px auto 0;">Strictly zero fake or synthetic rows are pre-populated. Click the Feedback button to submit a real feedback message.</p></div>'
            : '<table data-testid="admin-feedback-table" class="ufw-table">' +
              '  <thead><tr>' +
              '    <th style="width:15%;">ID &amp; Timestamp (ET)</th>' +
              '    <th style="width:15%;">App &amp; Route</th>' +
              '    <th style="width:14%;">Category &amp; Priority</th>' +
              '    <th style="width:14%;">Sender</th>' +
              '    <th style="width:26%;">Feedback Message</th>' +
              '    <th style="width:16%;">Status &amp; Actions</th>' +
              '  </tr></thead>' +
              '  <tbody>' +
              messages
                .map(function (item) {
                  var priBg =
                    item.priority === 'Critical'
                      ? 'background:#ffe4e6;color:#881337;border:1px solid #fda4af;'
                      : item.priority === 'High'
                        ? 'background:#fef3c7;color:#78350f;border:1px solid #fcd34d;'
                        : item.priority === 'Medium'
                          ? 'background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;'
                          : 'background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;';
                  var replyTo =
                    item.senderEmail && item.senderEmail !== 'anonymous'
                      ? item.senderEmail
                      : 'nitinagga@google.com';
                  var replyUrl =
                    'https://mail.google.com/mail/?view=cm&fs=1&to=' +
                    encodeURIComponent(replyTo) +
                    '&su=' +
                    encodeURIComponent('Re: ' + (item.subject || item.id));
                  return (
                    '<tr data-testid="admin-feedback-row-' +
                    escapeHtml(item.id) +
                    '">' +
                    '  <td><div style="font-family:monospace;font-weight:800;font-size:11px;color:#0f172a;">' +
                    escapeHtml(item.id) +
                    '</div><div style="font-size:11px;color:#64748b;margin-top:3px;">' +
                    escapeHtml(item.timestampEst) +
                    '</div></td>' +
                    '  <td><div style="font-weight:800;color:#0f172a;">' +
                    escapeHtml(item.appName) +
                    '</div><div style="font-family:monospace;font-size:11px;color:#1d4ed8;margin-top:3px;">' +
                    escapeHtml(item.pageUrl) +
                    '</div></td>' +
                    '  <td><div style="font-weight:700;color:#1e293b;margin-bottom:5px;">' +
                    escapeHtml(item.category) +
                    '</div><span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:800;' +
                    priBg +
                    '">' +
                    escapeHtml(item.priority) +
                    '</span></td>' +
                    '  <td><div style="font-weight:700;color:#0f172a;">' +
                    escapeHtml(item.senderName || 'Workspace User') +
                    '</div><div style="font-family:monospace;font-size:11px;color:#475569;margin-top:2px;">' +
                    escapeHtml(item.senderEmail || 'anonymous') +
                    '</div></td>' +
                    '  <td><div style="color:#0f172a;white-space:pre-wrap;line-height:1.45;">' +
                    escapeHtml(item.message) +
                    '</div></td>' +
                    '  <td>' +
                    '    <select data-fb-status-id="' +
                    escapeHtml(item.id) +
                    '" data-testid="admin-feedback-status-select-' +
                    escapeHtml(item.id) +
                    '" class="ufw-select" style="padding:4px 8px;font-size:11px;font-weight:800;margin-bottom:6px;">' +
                    STATUSES.map(function (st) {
                      return (
                        '<option value="' +
                        escapeHtml(st) +
                        '"' +
                        ((item.status || 'New') === st ? ' selected' : '') +
                        '>' +
                        escapeHtml(st) +
                        '</option>'
                      );
                    }).join('') +
                    '    </select>' +
                    '    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                    '      <a href="' +
                    escapeHtml(replyUrl) +
                    '" target="_blank" rel="noopener noreferrer" style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;text-decoration:none;">Reply ↗</a>' +
                    '      <button type="button" data-fb-delete-id="' +
                    escapeHtml(item.id) +
                    '" data-testid="admin-feedback-delete-btn-' +
                    escapeHtml(item.id) +
                    '" style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:#fff1f2;color:#881337;border:1px solid #fecdd3;cursor:pointer;">Delete</button>' +
                    '    </div>' +
                    '  </td>' +
                    '</tr>'
                  );
                })
                .join('') +
              '  </tbody></table>') +
          '</div>';

        document.getElementById('ufw-admin-back-btn').onclick = function () {
          overlay.remove();
          try {
            var cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('page');
            if (cleanUrl.pathname === '/admin/feedback') cleanUrl.pathname = '/';
            window.history.pushState({}, '', cleanUrl.toString());
          } catch (_) {}
        };
        document.getElementById('ufw-scope-all').onclick = function () {
          adminState.scope = 'all';
          renderAdminInbox(overlay, false);
        };
        document.getElementById('ufw-scope-app').onclick = function () {
          adminState.scope = 'app';
          renderAdminInbox(overlay, false);
        };
        document.getElementById('ufw-admin-refresh-btn').onclick = function () {
          renderAdminInbox(overlay, true);
        };
        document.getElementById('ufw-admin-new-fb-btn').onclick = function () {
          openFeedbackModal();
        };
        document.getElementById('ufw-filter-cat').onchange = function (e) {
          adminState.category = e.target.value;
          renderAdminInbox(overlay, false);
        };
        document.getElementById('ufw-filter-pri').onchange = function (e) {
          adminState.priority = e.target.value;
          renderAdminInbox(overlay, false);
        };
        document.getElementById('ufw-filter-st').onchange = function (e) {
          adminState.status = e.target.value;
          renderAdminInbox(overlay, false);
        };
        var searchInput = document.getElementById('ufw-admin-search');
        searchInput.onchange = function (e) {
          adminState.search = e.target.value;
          renderAdminInbox(overlay, false);
        };

        overlay.querySelectorAll('[data-fb-status-id]').forEach(function (sel) {
          sel.onchange = function () {
            var id = sel.getAttribute('data-fb-status-id');
            fetch('/api/feedback/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, status: sel.value }),
            }).then(function () {
              renderAdminInbox(overlay, true);
            });
          };
        });

        overlay.querySelectorAll('[data-fb-delete-id]').forEach(function (btn) {
          btn.onclick = function () {
            var id = btn.getAttribute('data-fb-delete-id');
            fetch('/api/feedback/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, delete: true }),
            }).then(function () {
              renderAdminInbox(overlay, true);
            });
          };
        });
      });
  }

  function mountTopCornerEmailButton() {
    injectStyles();
    if (document.getElementById('top-corner-feedback-email-btn')) return;

    var wrap = document.createElement('div');
    wrap.className = 'ufw-btn-wrap';
    wrap.innerHTML =
      '<button type="button" id="top-corner-feedback-email-btn" data-testid="give-feedback-email-icon-btn" title="Give Feedback to nitinagga@google.com" aria-label="Give Feedback to nitinagga@google.com" class="ufw-email-btn">' +
      '  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>' +
      '  <span>Feedback</span>' +
      '</button>' +
      '<div role="tooltip" data-testid="give-feedback-email-tooltip" class="ufw-tooltip">Give Feedback to nitinagga@google.com</div>';

    var target = null;
    if (MOUNT_SELECTOR) {
      target = document.querySelector(MOUNT_SELECTOR);
    }
    if (!target) {
      var hdr = document.querySelector('header');
      target =
        document.querySelector('[data-feedback-mount]') ||
        document.querySelector('.header-actions') ||
        document.querySelector('.top-nav-actions') ||
        document.querySelector('header .flex.items-center') ||
        (hdr && hdr.children.length >= 2 ? hdr.lastElementChild : hdr);
    }

    if (target) {
      target.appendChild(wrap);
    } else {
      wrap.style.position = 'fixed';
      wrap.style.top = '10px';
      wrap.style.right = '14px';
      wrap.style.zIndex = '9999';
      document.body.appendChild(wrap);
    }

    document.getElementById('top-corner-feedback-email-btn').onclick = function () {
      openFeedbackModal();
    };
  }

  function checkInitialAdminRoute() {
    var path = window.location.pathname.replace(/\/+$/, '');
    var initPath = INITIAL_PATHNAME.replace(/\/+$/, '');
    var sp = new URLSearchParams(window.location.search || INITIAL_SEARCH);
    if (
      path === '/admin/feedback' ||
      initPath === '/admin/feedback' ||
      sp.get('page') === 'admin-feedback'
    ) {
      openAdminInboxPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      mountTopCornerEmailButton();
      checkInitialAdminRoute();
    });
  } else {
    mountTopCornerEmailButton();
    checkInitialAdminRoute();
  }

  window.openUniversalFeedbackModal = openFeedbackModal;
  window.openUniversalAdminFeedbackInbox = openAdminInboxPage;
})();
