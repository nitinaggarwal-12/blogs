// ==========================================================================
// js/modals.js — Accessible Dialogs, FAQ Accordion & Cloud Viewer Controls
// ==========================================================================

    // FAQ Accordion Controls
    function toggleFAQ(btn) {
      var item = btn.closest('.faq-item');
      if (item) {
        var isActive = item.classList.toggle('active');
        btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      }
    }
    function expandAllFAQs(expand) {
      var items = document.querySelectorAll('.faq-item');
      items.forEach(function(item) {
        var btn = item.querySelector('.faq-question');
        if (expand) {
          item.classList.add('active');
          if (btn) btn.setAttribute('aria-expanded', 'true');
        } else {
          item.classList.remove('active');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
    }
    window.openPortalFAQ = function openPortalFAQ() {
      const modal = document.getElementById('portal-faq-modal');
      if (modal) {
        modal.classList.add('open');
        const items = modal.querySelectorAll('.faq-item');
        if (items.length > 0) {
          if (!items[0].classList.contains('active')) items[0].classList.add('active');
          const btn0 = items[0].querySelector('.faq-question');
          if (btn0) btn0.setAttribute('aria-expanded', 'true');
        }
        if (items.length > 1) {
          if (!items[1].classList.contains('active')) items[1].classList.add('active');
          const btn1 = items[1].querySelector('.faq-question');
          if (btn1) btn1.setAttribute('aria-expanded', 'true');
        }
        if (window.__trackClickstream) {
          window.__trackClickstream('FAQ_OPEN', 'portal-faq-modal', 'Opened Frequently Asked Questions Modal');
        }
      }
    };
    window.closePortalFAQ = function closePortalFAQ() {
      const modal = document.getElementById('portal-faq-modal');
      if (modal) modal.classList.remove('open');
    };
    window.scrollToPortalFAQ = window.openPortalFAQ;

    // Commercial PAYG SaaS Hub Client Helpers
    const PAYG_SAMPLE_ENDPOINTS = {
      snowflake: 'https://app.snowflake.com/api/v2/statements',
      datadog: 'https://api.datadoghq.com/api/v2/spans',
      databricks: 'https://community.cloud.databricks.com/api/2.0/clusters/list',
      clickhouse: 'https://api.clickhouse.cloud/v1/health',
      mongodb: 'https://cloud.mongodb.com/api/atlas/v2',
      confluent: 'https://api.confluent.cloud/kafka/v3/clusters',
      servicenow: 'https://developer.servicenow.com/',
      salesforce: 'https://login.salesforce.com/services/data/v59.0/sobjects/Case'
    };

    function populatePAYGSampleEndpoint(serviceId) {
      const select = document.getElementById('payg-tester-service-select');
      const urlInput = document.getElementById('payg-tester-endpoint-url');
      if (select && serviceId) select.value = serviceId;
      if (urlInput && PAYG_SAMPLE_ENDPOINTS[serviceId]) {
        urlInput.value = PAYG_SAMPLE_ENDPOINTS[serviceId];
      }
    }

    function scrollToPAYGConfigurator(serviceId) {
      switchTab('payg', document.getElementById('tab-btn-payg'));
      populatePAYGSampleEndpoint(serviceId);
      setTimeout(() => {
        const tester = document.getElementById('payg-tester-card');
        if (tester) {
          tester.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }

    async function testPAYGConnectionLive() {
      const select = document.getElementById('payg-tester-service-select');
      const urlInput = document.getElementById('payg-tester-endpoint-url');
      const tokenInput = document.getElementById('payg-tester-api-token');
      const runBtn = document.getElementById('payg-tester-run-btn');
      const telemetryBox = document.getElementById('payg-tester-telemetry');
      const statusBadge = document.getElementById('payg-telemetry-status-badge');
      const latencyBadge = document.getElementById('payg-telemetry-latency');
      const rawJson = document.getElementById('payg-telemetry-raw-json');

      const serviceId = select ? select.value : 'snowflake';
      const endpointUrl = urlInput ? urlInput.value.trim() : '';
      const apiToken = tokenInput ? tokenInput.value.trim() : '';

      if (!endpointUrl) {
        showPortalToast('Missing Endpoint URL', 'Please enter or select an approved HTTPS SaaS endpoint URL.');
        return;
      }

      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '&#9203; Testing...';
      }
      if (telemetryBox) telemetryBox.style.display = 'block';
      if (statusBadge) {
        statusBadge.innerHTML = 'STATUS: VALIDATING &amp; CONNECTING...';
        statusBadge.style.color = '#1d4ed8';
      }
      if (rawJson) rawJson.textContent = 'Validating HTTPS vendor allowlist & DNS SSRF policy before probing endpoint...';

      let warmTimer1 = setTimeout(() => {
        if (statusBadge) {
          statusBadge.innerHTML = 'STATUS: ⏳ CONNECTING (Container Warm-Up / TLS Handshake in Progress)...';
          statusBadge.style.color = '#d97706';
        }
        if (rawJson) {
          rawJson.textContent += '\n[WarmUpMitigation] Upstream container probe in progress (attempting cold-start handshake)...';
        }
      }, 2000);

      let warmTimer2 = setTimeout(() => {
        if (statusBadge) {
          statusBadge.innerHTML = 'STATUS: 🚀 CONTAINER WARMING UP (Scale-to-Zero Boot Detected, Awaiting Response)...';
          statusBadge.style.color = '#d97706';
        }
      }, 4500);

      try {
        const resp = await fetch('/api/payg-saas/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: serviceId,
            endpoint_url: endpointUrl,
            api_token: apiToken
          })
        });
        clearTimeout(warmTimer1);
        clearTimeout(warmTimer2);
        const data = await resp.json();
        if (rawJson) rawJson.textContent = JSON.stringify(data, null, 2);
        if (latencyBadge) {
          const attemptNote = (data.attempts && data.attempts > 1) ? ` (Warmed in Attempt ${data.attempts}/3)` : '';
          latencyBadge.textContent = 'Latency: ' + (data.latency_ms ?? '--') + ' ms' + attemptNote;
        }
        if (statusBadge) {
          const warmTag = data.cold_start_mitigated ? ' <span style="font-size:10.5px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:8px; border:1px solid #86efac; margin-left:6px;">WARMED UP</span>' : '';
          if (data.ok && data.authenticated) {
            statusBadge.innerHTML = '✅ AUTHENTICATED &amp; REACHED: HTTP ' + data.http_status + ' (' + data.status + ')' + warmTag;
            statusBadge.style.color = '#15803d';
          } else if (data.tls_reachable && !data.authenticated) {
            statusBadge.innerHTML = '🔒 TLS HOST REACHED — AUTH CREDENTIALS REQUIRED: HTTP ' + data.http_status + ' (' + data.status + ')' + warmTag;
            statusBadge.style.color = '#b45309';
          } else {
            statusBadge.textContent = '🛡️ BLOCKED / ERROR — ' + (data.status || 'ERROR') + ': HTTP ' + (data.http_status || resp.status || '403');
            statusBadge.style.color = '#b91c1c';
          }
        }
      } catch (err) {
        clearTimeout(warmTimer1);
        clearTimeout(warmTimer2);
        if (rawJson) rawJson.textContent = 'Network or Client Error: ' + err.message;
        if (statusBadge) {
          statusBadge.textContent = '❌ CONNECTION FAILED';
          statusBadge.style.color = '#b91c1c';
        }
      } finally {
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = '&#9889; Test Connection';
        }
      }
    }