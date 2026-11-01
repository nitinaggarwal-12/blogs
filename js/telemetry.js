// ==========================================================================
// js/telemetry.js — Client-Side Telemetry, Dwell Tracking & Beacon Dispatch
// ==========================================================================

    /* =========================================================================
       CLICKSTREAM TELEMETRY & WHO ACCESSED TRACKER (Rule 25 & Rule 50)
       ========================================================================= */
    const GEAP_SESSION_ID = (function() {
      try {
        let sid = sessionStorage.getItem('geap_session_id');
        if (!sid) {
          sid = 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
          sessionStorage.setItem('geap_session_id', sid);
        }
        return sid;
      } catch (_) {
        return 'sess-' + Math.random().toString(36).substring(2, 10);
      }
    })();

    let _telemetryStore = { totalEvents: 0, uniqueVisitorsCount: 0, visitors: {}, eventTypeCounts: {}, recentEvents: [] };
    let _telemetryTimer = null;

    function trackClickstream(eventType, targetId, targetTitle, metadata) {
      try {
        const payload = {
          sessionId: GEAP_SESSION_ID,
          eventType: (eventType || 'PAGE_VIEW').toUpperCase(),
          tab: (new URLSearchParams(window.location.search).get('tab') || 'overview'),
          targetId: targetId || '',
          targetTitle: targetTitle || '',
          url: window.location.href,
          referrer: document.referrer || '',
          metadata: metadata || {}
        };
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/telemetry/clickstream', blob);
        } else {
          fetch('/api/telemetry/clickstream', { method: 'POST', body: blob, keepalive: true }).catch(() => {});
        }
        // Optimistically increment badge
        const badge = document.getElementById('header-telemetry-badge');
        if (badge) {
          const cur = parseInt(badge.textContent || '0', 10) || 0;
          badge.textContent = cur + 1;
        }
      } catch (err) {
        console.warn('[Telemetry] Track error:', err);
      }
    }

    window.__trackClickstream = trackClickstream;

    function openTelemetryDrawer() {
      const drw = document.getElementById('telemetry-drawer');
      if (drw) {
        drw.classList.add('open');
        fetchTelemetrySummary();
        startTelemetryAutoRefresh();
      }
    }

    function closeTelemetryDrawer() {
      const drw = document.getElementById('telemetry-drawer');
      if (drw) {
        drw.classList.remove('open');
        stopTelemetryAutoRefresh();
      }
    }

    function toggleTelemetryDrawer() {
      const drw = document.getElementById('telemetry-drawer');
      if (!drw) return;
      if (drw.classList.contains('open')) closeTelemetryDrawer();
      else openTelemetryDrawer();
    }

    function switchTelemetrySubTab(subTab) {
      const btnUsers = document.getElementById('tel-tab-btn-users');
      const btnEvents = document.getElementById('tel-tab-btn-events');
      const paneUsers = document.getElementById('tel-sub-pane-users');
      const paneEvents = document.getElementById('tel-sub-pane-events');
      if (subTab === 'users') {
        if (btnUsers) btnUsers.classList.add('active');
        if (btnEvents) btnEvents.classList.remove('active');
        if (paneUsers) paneUsers.style.display = 'block';
        if (paneEvents) paneEvents.style.display = 'none';
      } else {
        if (btnUsers) btnUsers.classList.remove('active');
        if (btnEvents) btnEvents.classList.add('active');
        if (paneUsers) paneUsers.style.display = 'none';
        if (paneEvents) paneEvents.style.display = 'block';
        renderTelemetryEventsList();
      }
    }

    async function fetchTelemetrySummary() {
      try {
        const resp = await fetch('/api/telemetry/clickstream');
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.ok) {
          _telemetryStore = data;
          renderTelemetryKPIs();
          renderTelemetryUsersList();
          renderTelemetryEventsList();
          const badge = document.getElementById('header-telemetry-badge');
          if (badge) badge.textContent = data.totalEvents || 0;
          const syncLabel = document.getElementById('tel-last-sync-label');
          if (syncLabel) syncLabel.textContent = 'Last synced: ' + new Date().toLocaleTimeString();
        }
      } catch (err) {
        console.warn('[Telemetry] Fetch summary failed:', err);
      }
    }

    function renderTelemetryKPIs() {
      const elTotal = document.getElementById('tel-kpi-total-events');
      const elUsers = document.getElementById('tel-kpi-unique-users');
      const elSim = document.getElementById('tel-kpi-sim-runs');
      const elDl = document.getElementById('tel-kpi-downloads');
      if (elTotal) elTotal.textContent = _telemetryStore.totalEvents || 0;
      if (elUsers) elUsers.textContent = _telemetryStore.uniqueVisitorsCount || Object.keys(_telemetryStore.visitors || {}).length || 0;
      const counts = _telemetryStore.eventTypeCounts || {};
      if (elSim) elSim.textContent = counts.SIMULATION_RUN || 0;
      if (elDl) elDl.textContent = counts.SLIDE_DOWNLOAD || 0;
      const subUsersCount = document.getElementById('tel-sub-users-count');
      if (subUsersCount) subUsersCount.textContent = _telemetryStore.uniqueVisitorsCount || Object.keys(_telemetryStore.visitors || {}).length || 0;
      const subEventsCount = document.getElementById('tel-sub-events-count');
      if (subEventsCount) subEventsCount.textContent = _telemetryStore.totalEvents || 0;
    }

    function renderTelemetryUsersList() {
      const container = document.getElementById('tel-users-list');
      if (!container) return;
      const visitors = _telemetryStore.visitors || {};
      const emails = Object.keys(visitors);
      if (emails.length === 0) {
        container.innerHTML = '<div style="padding:16px; text-align:center; color:#94a3b8; font-size:12px;">No visitors recorded yet. Events stream in real-time as users open the portal.</div>';
        return;
      }
      // Sort by lastSeen descending
      emails.sort((a, b) => (visitors[b].lastSeen || '').localeCompare(visitors[a].lastSeen || ''));
      container.innerHTML = emails.map(email => {
        const v = visitors[email] || {};
        const initial = escapeHtml(String(v.actorName || email).slice(0, 2).toUpperCase());
        const safeName = escapeHtml(v.actorName || email);
        const safeEmail = escapeHtml(email);
        const safeCount = Number(v.eventCount) || 1;
        const safeLast = escapeHtml(v.lastSeenEst ? v.lastSeenEst.split(' ')[1] : 'Recent');
        return `
          <div style="padding:10px 12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px; min-width:0;">
              <div style="width:28px; height:28px; border-radius:50%; background:#1a73e8; color:#ffffff; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${initial}</div>
              <div style="min-width:0;">
                <div style="font-size:12px; font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</div>
                <div style="font-size:11px; color:#64748b; font-family:monospace;">${safeEmail}</div>
              </div>
            </div>
            <div style="text-align:right; flex-shrink:0;">
              <span class="badge badge-blue" style="font-size:10px; font-weight:700;">${safeCount} Actions</span>
              <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Last: ${safeLast}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderTelemetryEventsList() {
      const container = document.getElementById('tel-events-list');
      if (!container) return;
      const events = _telemetryStore.recentEvents || [];
      const filterText = (document.getElementById('tel-event-filter-input')?.value || '').toLowerCase();
      const typeFilter = document.getElementById('tel-type-filter-select')?.value || 'ALL';

      const filtered = events.filter(e => {
        if (typeFilter !== 'ALL' && e.eventType !== typeFilter) return false;
        if (!filterText) return true;
        return (e.actorEmail || '').toLowerCase().includes(filterText) ||
               (e.eventType || '').toLowerCase().includes(filterText) ||
               (e.targetTitle || '').toLowerCase().includes(filterText) ||
               (e.targetId || '').toLowerCase().includes(filterText) ||
               (e.tab || '').toLowerCase().includes(filterText);
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="padding:16px; text-align:center; color:#94a3b8; font-size:12px;">No matching clickstream events found.</div>';
        return;
      }

      const getBadgeClass = (t) => {
        if (t === 'PAGE_LOAD') return 'badge-blue';
        if (t === 'SIMULATION_RUN') return 'badge-green';
        if (t === 'BLUEPRINT_VIEW') return 'badge-purple';
        if (t === 'PAYG_ACTION') return 'badge-amber';
        if (t === 'SLIDE_DOWNLOAD') return 'badge-red';
        return 'badge-blue';
      };

      container.innerHTML = filtered.slice(0, 60).map(e => `
        <div style="padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; font-size:11px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge ${getBadgeClass(e.eventType)}" style="font-size:9.5px; font-weight:700;">${escapeHtml(e.eventType || '')}</span>
              <span style="font-weight:700; color:#0f172a;">${escapeHtml(e.actorEmail || '')}</span>
            </div>
            <span style="color:#94a3b8; font-size:10px;">${escapeHtml(e.timestampEst ? e.timestampEst.split(' ')[1] : '')}</span>
          </div>
          <div style="color:#334155; margin-top:2px;">
            <span style="color:#64748b; font-weight:600;">[${escapeHtml(e.tab || '')}]</span> ${escapeHtml(e.targetTitle || e.targetId || '')}
          </div>
        </div>
      `).join('');
    }

    function toggleTelemetryAutoRefresh(enabled) {
      if (enabled) startTelemetryAutoRefresh();
      else stopTelemetryAutoRefresh();
    }

    function startTelemetryAutoRefresh() {
      stopTelemetryAutoRefresh();
      _telemetryTimer = setInterval(fetchTelemetrySummary, 4000);
      const pill = document.getElementById('telemetry-streaming-pill');
      if (pill) pill.textContent = '🟢 Live Streaming';
    }

    function stopTelemetryAutoRefresh() {
      if (_telemetryTimer) {
        clearInterval(_telemetryTimer);
        _telemetryTimer = null;
      }
      const pill = document.getElementById('telemetry-streaming-pill');
      if (pill) pill.textContent = '⏸️ Paused';
    }

    function exportTelemetryJson() {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(_telemetryStore, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'geap_clickstream_telemetry_' + new Date().toISOString().slice(0, 10) + '.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    // Attach initial page-load beacon
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        trackClickstream('PAGE_LOAD', 'initial_load', document.title, {
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          userAgent: navigator.userAgent
        });
        fetchTelemetrySummary();
      }, 500);
    });

    // Dwell time on visibility hidden or unload
    let _pageDwellStart = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        const dwellSec = Math.round((Date.now() - _pageDwellStart) / 1000);
        trackClickstream('PAGE_DWELL', 'session_dwell', 'Session Dwell Time', { durationSec: dwellSec });
      } else {
        _pageDwellStart = Date.now();
      }
    });