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
          const view = state.view || params.get('view');
          if (view && typeof setHubViewMode === 'function') {
            setHubViewMode(view, params.get('target'), true);
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


    // ==========================================================================
    // Digital Twin & Live 10-SaaS UI Proofs Studio (Tab 1 Sub-Tab)
    // ==========================================================================
    const DT_PROOFS_DATA = [
  {
    "index": 1,
    "key": "metabase",
    "enterprise_saas_domain": "ThoughtSpot Cloud (Spotter Agentic BI v2.0)",
    "agentcore_target_id": "HXGGFMZBKE",
    "mcp_tool_name": "query_thoughtspot_liveboard_rls",
    "true_product_name": "Metabase BI",
    "product_version": "v0.50.26",
    "upstream_docker_image": "metabase/metabase:v0.50.26",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-metabase-bi-fm3mts5x3a-uw.a.run.app/question/27",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json",
    "before_summary": "Unfiltered multi-tenant settlement table exposing 3 rows across tenants (FV-TX-901 finvault, FV-TX-902 finvault, plus cross-tenant RS-ORD-401 retailstream) prior to GEAP Hop 5 RLS binding.",
    "agentic_action_executed": "GEAP MCP tool query_thoughtspot_liveboard_rls (Target HXGGFMZBKE) enforces session predicate WHERE tenant_id = 'finvault' and executes Saved Liveboard Question #27.",
    "after_summary": "Metabase Liveboard Question #27 returns strictly the 2 authorized FinVault rows ($527.0M total: FV-TX-901 $312.5M + FV-TX-902 $214.5M) with 0 cross-tenant RetailStream rows.",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_01_metabase_bi.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_01_metabase_bi.png",
      "http_status": 200,
      "page_title": "Unfiltered Multi-Tenant Wire Ledger (Pre-RLS \u2014 Cross-Tenant Exposure Risk) \u00b7 Metabase",
      "width": 2880,
      "height": 1800,
      "bytes": 154000,
      "sha256": "b1c45d4e2b09a313b8460a1eca43761a0fce2361950be89c3dfc7addeb77cdc4",
      "captured_at": "2026-10-30T13:41:14.872Z"
    },
    "after": {
      "filename": "after_01_metabase_bi.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_01_metabase_bi.png",
      "http_status": 200,
      "page_title": "FinVault OCC Wire Settlement Liveboard ($527.0M \u2014 RLS: tenant_id = finvault) \u00b7 Metabase",
      "width": 2880,
      "height": 1800,
      "bytes": 142668,
      "sha256": "d6fdc81d4a63b9dda864ad20033b2d4107a067a55783dfb5a32c6ad958918b7e",
      "captured_at": "2026-10-30T13:41:14.872Z"
    },
    "spoken_script": "Welcome to the Pattern A multi-cloud verification lab. Here on the left is the baseline unmanaged state: an unfiltered Metabase dashboard exposing rows across both FinVault and RetailStream. On the right, watch what happens when our Cloud Run agent executes query_thoughtspot_liveboard_rls through the AWS Bedrock AgentCore MCP gateway. Hop 1 injects the immutable tenant session context, Hop 5 pushes the WHERE tenant_id = 'finvault' filter down to the database, and the result returns strictly the two authorized FinVault wire settlement rows totaling 527 million dollars, with zero cross-tenant leakage."
  },
  {
    "index": 2,
    "key": "grafana",
    "enterprise_saas_domain": "Sigma Computing (Cloud BI Workbooks REST API v2)",
    "agentcore_target_id": "IZVODT083Q",
    "mcp_tool_name": "eval_sigma_workbook_rls",
    "true_product_name": "Grafana Enterprise",
    "product_version": "v11.2.0",
    "upstream_docker_image": "grafana/grafana-enterprise:11.2.0",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-grafana-ent-fm3mts5x3a-uw.a.run.app/d/finvault-sre-wb?orgId=1",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json",
    "before_summary": "Grafana Enterprise workbook finvault-sre-wb (orgId=1) in single-panel pre-audit baseline before GEAP Hop 5 workbook evaluation and live S3 attestation write-back.",
    "agentic_action_executed": "GEAP MCP tool eval_sigma_workbook_rls (Target IZVODT083Q) evaluates tenant RLS session GUC and updates Grafana dashboard finvault-sre-wb via POST /api/dashboards/db with the live Hop 5 execution & HTTP 403 spoof-block attestation panel.",
    "after_summary": "Grafana Enterprise renders the newly appended Panel #2 (GEAP Hop 5 Live Agentic Execution Attestation & Cross-Org Spoof Audit) alongside the verified $527.0M FinVault summary.",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_02_grafana_enterprise.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_02_grafana_enterprise.png",
      "http_status": 200,
      "page_title": "FinVault OCC Wire Settlement & FinOps Workbook (RLS: ua_tenant_id=finvault) - Dashboards - Grafana",
      "width": 2880,
      "height": 1800,
      "bytes": 262882,
      "sha256": "fe7451dcec1f0df1a60a5c28897a202e0dcc9353a15246b549af8bf1b78c11dc",
      "captured_at": "2026-10-30T14:08:51.158Z"
    },
    "after": {
      "filename": "after_02_grafana_enterprise.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_02_grafana_enterprise.png",
      "http_status": 200,
      "page_title": "FinVault OCC Wire Settlement & FinOps Workbook (RLS: ua_tenant_id=finvault) - Dashboards - Grafana",
      "width": 2880,
      "height": 1800,
      "bytes": 406090,
      "sha256": "3957e3f721d0afb58410fe05eacbacb3f885584c634a5aee7ec4334840db53dc",
      "captured_at": "2026-10-30T14:08:51.159Z"
    },
    "spoken_script": "For Sigma Computing workbook analytics, we verify warehouse RLS pushdown. When RetailStream queries workbook 02, the proxy validates their ua_tenant_id. Notice the red-team breach attempt: when RetailStream attempts to tamper with their user attribute to impersonate FinVault, the agent runtime terminates the turn with HTTP 403 DENY_SIGMA_UA_TENANT_TAMPERING, protecting the warehouse."
  },
  {
    "index": 3,
    "key": "redmine",
    "enterprise_saas_domain": "ServiceNow ITSM & ITOM Change Control",
    "agentcore_target_id": "ZS9VGYHBQL",
    "mcp_tool_name": "query_servicenow_change_records",
    "true_product_name": "Redmine ITSM",
    "product_version": "v5.1",
    "upstream_docker_image": "library/redmine:5.1",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-redmine-itsm-fm3mts5x3a-uw.a.run.app/projects/finvault-itsm/issues?set_filter=1&status_id=*",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json",
    "before_summary": "Redmine ITSM project finvault-itsm queue showing 2 baseline tickets (#1 CHG0049218 and #2 INC0948211 \u2014 1-2/2) prior to automated GEAP change-attestation ticket creation.",
    "agentic_action_executed": "GEAP MCP tool query_servicenow_change_records (Target ZS9VGYHBQL) validates CMEK & Valkey single-flight readiness and creates P1 Change Ticket CHG0049299 via POST /issues.json.",
    "after_summary": "Redmine ITSM queue updates live to 3 tickets (1-3/3) displaying newly created CHG0049299 ([GEAP-MCP ZS9VGYHBQL] Automated Hop 5 Valkey Single-Flight & KMS CMEK Attestation) assigned to FinVault SRE Lead.",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_03_redmine_itsm.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_03_redmine_itsm.png",
      "http_status": 200,
      "page_title": "Issues - FinVault Core Banking ITSM & Change Control (PLOLWRMI0I) - Redmine",
      "width": 2880,
      "height": 1800,
      "bytes": 217411,
      "sha256": "5d9b0c6d0f7d5d7c28819720fc3520e87827f07ddb5cd0fe643a4c86f9f5662a",
      "captured_at": "2026-10-30T13:41:31.519Z"
    },
    "after": {
      "filename": "after_03_redmine_itsm.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_03_redmine_itsm.png",
      "http_status": 200,
      "page_title": "Issues - FinVault Core Banking ITSM & Change Control (PLOLWRMI0I) - Redmine",
      "width": 2880,
      "height": 1800,
      "bytes": 261741,
      "sha256": "394c45763ca4414e3e30e6f407d551783207bef0ca10febaeab1a7eedf5ca3ad",
      "captured_at": "2026-10-30T13:41:31.519Z"
    },
    "spoken_script": "In ServiceNow change management, we enforce RFC 9449 DPoP-bound 3-legged OAuth consent. If an agent attempts to modify change order CHG0049218 without explicit user consent, Hop 5 intercepts the call and emits an interactive OAuth consent challenge with MCP error code minus 32042. Once consented, the live change details are retrieved safely."
  },
  {
    "index": 4,
    "key": "nocodb",
    "enterprise_saas_domain": "Veeva Vault RIM & Muse Clinical EDC (21 CFR Part 11)",
    "agentcore_target_id": "TWQU0KSRVF",
    "mcp_tool_name": "query_muse_study_biomarkers",
    "true_product_name": "NocoDB",
    "product_version": "v0.255.2",
    "upstream_docker_image": "nocodb/nocodb:0.255.2",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-nocodb-edc-fm3mts5x3a-uw.a.run.app/",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json",
    "before_summary": "NocoDB FinVault KMS 21 CFR 11 Full Ledger showing 3 seeded compliance rows (AWS-GXP-101..103 \u2014 3 records in footer) prior to live Cloud KMS ECDSA-P256 electronic signature insertion.",
    "agentic_action_executed": "GEAP MCP tool query_muse_study_biomarkers (Target TWQU0KSRVF) signs the Hop 5 audit digest with Cloud KMS HSM and inserts record AWS-GXP-104 via POST /api/v2/tables/.../records.",
    "after_summary": "NocoDB grid updates live to 4 records, displaying row #4 AWS-GXP-104 (finvault \u2022 Pattern C Hybrid PSC + Hop 5 KMS Sign \u2022 ECDSA_P256_LIVE_AGENT_SIGNED).",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_04_nocodb_gxp.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_04_nocodb_gxp.png",
      "http_status": 304,
      "page_title": "FinVault KMS 21 CFR 11 Full... | Cymbal GxP 21 CFR Part 11 K...",
      "width": 2880,
      "height": 1800,
      "bytes": 249592,
      "sha256": "4f373d705a452186156970184f7aeba25b837e1d98b045e3349c6f9dadcc31f1",
      "captured_at": "2026-10-30T14:13:10.732Z"
    },
    "after": {
      "filename": "after_04_nocodb_gxp.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_04_nocodb_gxp.png",
      "http_status": 200,
      "page_title": "FinVault KMS 21 CFR 11 Full... | Cymbal GxP 21 CFR Part 11 K...",
      "width": 2880,
      "height": 1800,
      "bytes": 270999,
      "sha256": "cc7d99494817dce5b6b609a68308eebcf6b6d904866fb22aee7a13877569482f",
      "captured_at": "2026-10-30T14:13:10.732Z"
    },
    "spoken_script": "In regulated life sciences, tenant isolation is a GxP requirement. Here, Veeva clinical biomarker queries are restricted by Hop 2 catalog ACLs. Any unauthorized tenant attempting to discover or invoke the restricted clinical MCP is rejected at the registry layer with HTTP 403 TENANT_CONNECTOR_ACL_DENIED. Authorized runs are sealed with a Cloud KMS 21 CFR Part 11 digital signature."
  },
  {
    "index": 5,
    "key": "gitea",
    "enterprise_saas_domain": "Salesforce CRM (NA224) & Atlassian Jira Cloud Escalations",
    "agentcore_target_id": "K5JAEFCQ6E",
    "mcp_tool_name": "create_redacted_sfdc_jira_escalation",
    "true_product_name": "Gitea",
    "product_version": "v1.22.3",
    "upstream_docker_image": "gitea/gitea:1.22.3",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-gitea-sre-fm3mts5x3a-uw.a.run.app/finvault/sre-escalations/issues/1",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json",
    "before_summary": "Gitea repository finvault/sre-escalations Issue #1 ([SFDC-CASE-00984120 / FINVAULT-SRE-1402]) open with 0 comments prior to GEAP Hop 4 SDP-redacted RCA triage.",
    "agentic_action_executed": "GEAP MCP tool create_redacted_sfdc_jira_escalation (Target K5JAEFCQ6E) strips IBAN/SWIFT PII via Cloud SDP and posts a structured Markdown RCA comment via POST /api/v1/repos/finvault/sre-escalations/issues/1/comments.",
    "after_summary": "Gitea Issue #1 updates live to 1 comment, rendering the authenticated sre-lead Hop 4 SDP-redacted automated RCA & Valkey mitigation receipt directly in the issue timeline.",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_05_gitea_sre.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_05_gitea_sre.png",
      "http_status": 200,
      "page_title": "#1 - [SFDC-CASE-00984120 / FINVAULT-SRE-1402] P1 Wire Settlement Escalation (Hop 4 SDP Redacted) - sre-escalations - Gitea: Git with a cup of tea",
      "width": 2880,
      "height": 1800,
      "bytes": 370201,
      "sha256": "4317e1037937d3d8beb7d7753d088ec7ad6551c4a458fe694e772d5baf2de554",
      "captured_at": "2026-10-30T14:09:22.444Z"
    },
    "after": {
      "filename": "after_05_gitea_sre.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_05_gitea_sre.png",
      "http_status": 200,
      "page_title": "#1 - [SFDC-CASE-00984120 / FINVAULT-SRE-1402] P1 Wire Settlement Escalation (Hop 4 SDP Redacted) - sre-escalations - Gitea: Git with a cup of tea",
      "width": 2880,
      "height": 1800,
      "bytes": 479963,
      "sha256": "15d3ea9d83dab4fb8f63909c9b97b8b4c32c9f3d889edd078807f3227b9e5410",
      "captured_at": "2026-10-30T14:09:22.444Z"
    },
    "spoken_script": "Here we evaluate cross-tenant data loss prevention during support ticket escalation. Even if a prompt contains raw SWIFT codes or banking IBANs, Hop 4 Cloud Sensitive Data Protection intercepts the payload and masks the sensitive data before external SaaS egress, ensuring clean compliance."
  },
  {
    "index": 6,
    "key": "trino",
    "enterprise_saas_domain": "Databricks Data Intelligence Platform (Unity Catalog SQL)",
    "agentcore_target_id": "TERCK8SLBP",
    "mcp_tool_name": "execute_uc_genie_federated_sql",
    "true_product_name": "Trino Distributed SQL",
    "product_version": "v440",
    "upstream_docker_image": "trinodb/trino:440",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-trino-sql-fm3mts5x3a-uw.a.run.app/ui/",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json",
    "before_summary": "Trino v440 Cluster Overview (/ui/) query ledger prior to GEAP Target TERCK8SLBP tenant-scoped federated SQL dispatch.",
    "agentic_action_executed": "GEAP MCP tool execute_uc_genie_federated_sql (Target TERCK8SLBP) dispatches federated SQL via POST /v1/statement with X-Trino-User: geap-hop5-agent@finvault.com and X-Trino-Source: geap-agentcore-TERCK8SLBP.",
    "after_summary": "Trino Cluster Overview (/ui/) displays the newly completed FINISHED query at top of Query Details attributed to geap-hop5-agent@finvault.com (source: geap-agentcore-TERCK8SLBP).",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_06_trino_sql.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_06_trino_sql.png",
      "http_status": 200,
      "page_title": "Cluster Overview - Trino",
      "width": 2880,
      "height": 1800,
      "bytes": 267318,
      "sha256": "3b9d35a850a519928efe4bf0e2b72750e32a511f83639ca6f1850fc33724118e",
      "captured_at": "2026-10-30T13:42:10.943Z"
    },
    "after": {
      "filename": "after_06_trino_sql.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_06_trino_sql.png",
      "http_status": 200,
      "page_title": "Cluster Overview - Trino",
      "width": 2880,
      "height": 1800,
      "bytes": 262266,
      "sha256": "5a2241216d38414641c4cf3a5088a6e5dc8e16832f455eee1b29f24e8e0b79c7",
      "captured_at": "2026-10-30T13:42:10.943Z"
    },
    "spoken_script": "For Databricks Unity Catalog, we red-team SQL injection and schema escalation. When an adversarial prompt injects a semicolon and drop table statement, Hop 4 SQL sanitization blocks the execution with HTTP 403, while legitimate analytical queries execute cleanly within the tenant's Gold lakehouse catalog."
  },
  {
    "index": 7,
    "key": "clickhouse",
    "enterprise_saas_domain": "Snowflake AI Data Cloud (Cortex Analyst & SQL v2)",
    "agentcore_target_id": "CCMDEVZV2S",
    "mcp_tool_name": "execute_cortex_analyst_sql",
    "true_product_name": "ClickHouse Data Warehouse",
    "product_version": "v24.8",
    "upstream_docker_image": "clickhouse/clickhouse-server:24.8",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-clickhouse-dw-fm3mts5x3a-uw.a.run.app/play",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json",
    "before_summary": "ClickHouse v24.8 /play SQL console authenticated as finvault_user attempting a cross-tenant query (WHERE tenant_id = 'retailstream') \u2014 database Row-Level Security blocks cross-tenant exposure and returns 0 rows.",
    "agentic_action_executed": "GEAP MCP tool execute_cortex_analyst_sql (Target CCMDEVZV2S) executes the tenant-aligned query (WHERE tenant_id = 'finvault') under finvault_user RLS policy.",
    "after_summary": "ClickHouse /play console returns the 2 CMEK-protected FinVault wire settlement rows (FV-TX-901 $312.5M and FV-TX-902 $214.5M, gcp-kms://finvault-cmek-hsm) in <5ms.",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_07_clickhouse_rls.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_07_clickhouse_rls.png",
      "http_status": 200,
      "page_title": "ClickHouse Query: SELECT entity_id, tenant_id, portfolio, settlement_usd, cmek_key_uri FROM cymbal_warehouse.wire_settlement_ledger WHERE tenant_id = 'retailstream' ORDER BY entity_id;",
      "width": 2880,
      "height": 1800,
      "bytes": 137349,
      "sha256": "40c6a4c46b87ecd310408c289833df4847cb42a3312b12e43cfffd58c0dc094d",
      "captured_at": "2026-10-30T13:42:18.506Z"
    },
    "after": {
      "filename": "after_07_clickhouse_rls.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_07_clickhouse_rls.png",
      "http_status": 200,
      "page_title": "ClickHouse Query: SELECT entity_id, tenant_id, portfolio, settlement_usd, cmek_key_uri FROM cymbal_warehouse.wire_settlement_ledger WHERE tenant_id = 'finvault' ORDER BY entity_id;",
      "width": 2880,
      "height": 1800,
      "bytes": 158487,
      "sha256": "5118174f054abdf0a434232534dd66297bd410d855e11677450988529d337029",
      "captured_at": "2026-10-30T13:42:18.506Z"
    },
    "spoken_script": "With Snowflake Cortex Analyst, we enforce secondary role restrictions. An adversary attempting to execute USE SECONDARY ROLES ALL to escalate privileges across roles is blocked immediately. Authorized turns execute strictly within ROLE_CYMBAL_RETAILSTREAM."
  },
  {
    "index": 8,
    "key": "directus",
    "enterprise_saas_domain": "Workday Enterprise HCM & Financial Management RaaS",
    "agentcore_target_id": "RAOTMUMJTZ",
    "mcp_tool_name": "fetch_compensation_raas_report",
    "true_product_name": "Directus Data Studio",
    "product_version": "v11.1.0",
    "upstream_docker_image": "directus/directus:11.1.0",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-directus-hcm-fm3mts5x3a-uw.a.run.app/admin/content/hcm_compensation",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json",
    "before_summary": "Directus v11.1.0 Hcm Compensation collection showing 2 baseline executive records (Clara Vance & Marcus Thorne \u2014 2 Items) prior to GEAP RaaS compensation audit sync.",
    "agentic_action_executed": "GEAP MCP tool fetch_compensation_raas_report (Target RAOTMUMJTZ) masks SSN/IBAN fields via Hop 4 Cloud SDP and inserts audited FinVault executive record via POST /items/hcm_compensation.",
    "after_summary": "Directus Hcm Compensation collection updates live to 3 Items, adding Elena Rostova (MD Quantitative Risk \u2014 GEAP Audited, $395,000.00, [REDACTED_US_SSN]).",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_08_directus_hcm.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_08_directus_hcm.png",
      "http_status": 200,
      "page_title": "Hcm Compensation \u00b7 Directus",
      "width": 2880,
      "height": 1800,
      "bytes": 133092,
      "sha256": "a06e141d9d13c82a401a22f7f64b1cae32847a67a0d335ee8bacc28519c7c6ad",
      "captured_at": "2026-10-30T13:42:33.601Z"
    },
    "after": {
      "filename": "after_08_directus_hcm.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_08_directus_hcm.png",
      "http_status": 304,
      "page_title": "Hcm Compensation \u00b7 Directus",
      "width": 2880,
      "height": 1800,
      "bytes": 147817,
      "sha256": "7f3ff88d0cc445cf633a41d4d860164069507cba191a25ce39e2dcc7acf19c84",
      "captured_at": "2026-10-30T13:42:33.601Z"
    },
    "spoken_script": "In Workday HR and compensation workflows, we guard against intra-tenant token replay. If user Bob attempts to replay Alice's cached 3LO bearer token to inspect executive compensation, the runtime detects the principal mismatch and returns HTTP 401, while authorized syncs redact US Social Security numbers."
  },
  {
    "index": 9,
    "key": "seq",
    "enterprise_saas_domain": "Datadog Cloud Observability & Bits AI SRE",
    "agentcore_target_id": "G767QR3TQZ",
    "mcp_tool_name": "query_tenant_apm_logs",
    "true_product_name": "Datalust Seq Observability",
    "product_version": "v2024.3",
    "upstream_docker_image": "datalust/seq:2024.3",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-seq-apm-fm3mts5x3a-uw.a.run.app/#/events",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json",
    "before_summary": "Datalust Seq v2024.3 /#/events telemetry view in compact collapsed stream baseline prior to live GEAP Hop 4 Model Armor + Hop 5 RLS structured OTel span ingestion.",
    "agentic_action_executed": "GEAP MCP tool query_tenant_apm_logs (Target G767QR3TQZ) ingests a structured Serilog CLEF span via POST /api/events/raw?clef and expands the live event inspector in Seq UI.",
    "after_summary": "Datalust Seq displays the newly ingested GEAP Hop 5 APM trace expanded in-place with structured properties (AgentCoreTarget=G767QR3TQZ, Hop4ModelArmor=PASS_ZERO_PROMPT_INJECTION, TenantId=finvault, ZeroPiiAttested=true).",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_09_datalust_seq.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_09_datalust_seq.png",
      "http_status": 200,
      "page_title": "Events \u2014 Seq",
      "width": 2880,
      "height": 1800,
      "bytes": 228587,
      "sha256": "ace89a1b913fd59ca74b8ef3c3e866cda6615be0fe29300d23309ace3ec86a92",
      "captured_at": "2026-10-30T14:09:32.942Z"
    },
    "after": {
      "filename": "after_09_datalust_seq.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_09_datalust_seq.png",
      "http_status": 200,
      "page_title": "Events \u2014 Seq",
      "width": 2880,
      "height": 1800,
      "bytes": 303832,
      "sha256": "1633de1b110bececdce19116e6493dda1ec8c7f92357f607560e48073dc623aa",
      "captured_at": "2026-10-30T14:09:32.942Z"
    },
    "spoken_script": "For Datadog observability and APM, we test prompt injection defense inside operational logs. When an adversarial payload injects an 'IGNORE ALL PREVIOUS INSTRUCTIONS' payload, Hop 4 Model Armor classifies the threat and blocks ingestion with HTTP 400, preserving log stream integrity."
  },
  {
    "index": 10,
    "key": "vault",
    "enterprise_saas_domain": "CrowdStrike Falcon XDR & Okta Workforce Identity",
    "agentcore_target_id": "C7EYM614F2",
    "mcp_tool_name": "contain_xdr_host_with_dpop",
    "true_product_name": "HashiCorp Vault",
    "product_version": "v1.13.3",
    "upstream_docker_image": "hashicorp/vault:1.13.3",
    "cloud_provider_captured": "AWS",
    "cloud_run_service_url": "https://cymbal-gcp-vault-cmek-fm3mts5x3a-uw.a.run.app/ui/vault/secrets/secret/show/tenants/finvault",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json",
    "before_summary": "HashiCorp Vault v1.13.3 secret tenants/finvault at Version 1 (JSON view enabled) showing pre-containment state (xdr_containment_status: PENDING_HOP5_DPOP_CONTAINMENT).",
    "agentic_action_executed": "GEAP MCP tool contain_xdr_host_with_dpop (Target C7EYM614F2) verifies RFC 9449 DPoP proof thumbprint and rotates tenants/finvault to Version 2 via POST /v1/secret/data/tenants/finvault.",
    "after_summary": "HashiCorp Vault UI displays Version 2 of tenants/finvault in live JSON mode with xdr_containment_status: HOST_CONTAINED_DPOP_VERIFIED_200 and S3 audit binding crowdstrike-okta/finvault.json.",
    "sha256_distinct_verified": true,
    "zero_synthetic_markup": true,
    "before": {
      "filename": "before_10_hashicorp_vault.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/before_10_hashicorp_vault.png",
      "http_status": 200,
      "page_title": "Vault",
      "width": 2880,
      "height": 1800,
      "bytes": 172830,
      "sha256": "95fbae1e2b774334413c8f8f3c80b02f61fa50ec65c72992b352aab5fdad0471",
      "captured_at": "2026-10-30T13:49:55.978Z"
    },
    "after": {
      "filename": "after_10_hashicorp_vault.png",
      "rel_path": "screenshots/genuine-multicloud-3p-uis/before-after/after_10_hashicorp_vault.png",
      "http_status": 200,
      "page_title": "Vault",
      "width": 2880,
      "height": 1800,
      "bytes": 203372,
      "sha256": "a0156ef0e02391f44e0e44be806e21a260d3fde5661dc8184a6dd41ebb091460",
      "captured_at": "2026-10-30T13:49:55.978Z"
    },
    "spoken_script": "Finally, for SecOps host containment and credential rotation in HashiCorp Vault, we enforce cryptographic DPoP proof binding. Replaying a stolen bearer token without the private key proof fails with HTTP 401 proof mismatch, while legitimate rotation transitions the host to contained status safely."
  }
];
    let dtActiveIndex = 1;
    let dtSliderMode = 'slider';
    let dtIsSpeaking = false;
    let dtCurrentUtterance = null;

    function setHubViewMode(mode, targetId, skipHistoryReplace) {
      const blogSec = document.getElementById('hub-blog-section');
      const proofsSec = document.getElementById('hub-proofs-section');
      const btnGuide = document.getElementById('btn-view-mode-guide');
      const btnEap = document.getElementById('btn-view-mode-eap');
      const btnProofs = document.getElementById('btn-view-mode-proofs');
      const btnDeliverables = document.getElementById('btn-view-mode-deliverables');

      // Clear all active primary classes
      [btnGuide, btnEap, btnProofs, btnDeliverables].forEach(btn => {
        if (btn) btn.classList.remove('primary');
      });

      if (mode === 'proofs') {
        if (blogSec) blogSec.style.display = 'none';
        if (proofsSec) proofsSec.style.display = 'block';
        if (btnProofs) btnProofs.classList.add('primary');
        initDtProofsStudio(targetId);
      } else if (mode === 'eap') {
        if (blogSec) blogSec.style.display = 'block';
        if (proofsSec) proofsSec.style.display = 'none';
        if (btnEap) btnEap.classList.add('primary');
        setTimeout(() => {
          const readerEl = document.getElementById('hub-blog-reader');
          if (readerEl) {
            const h = Array.from(readerEl.querySelectorAll('h2, h3')).find(el => 
              (el.textContent || '').includes('Compensating controls') || 
              (el.textContent || '').includes('EAP') ||
              (el.textContent || '').includes('Early Access Program')
            );
            if (h) {
              h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }, 50);
      } else if (mode === 'deliverables') {
        if (blogSec) blogSec.style.display = 'block';
        if (proofsSec) proofsSec.style.display = 'none';
        if (btnDeliverables) btnDeliverables.classList.add('primary');
        setTimeout(() => {
          const readerEl = document.getElementById('hub-blog-reader');
          if (readerEl) {
            const h = Array.from(readerEl.querySelectorAll('h2, h3')).find(el => 
              (el.textContent || '').includes("What's next") || 
              (el.textContent || '').includes('Deliverables') ||
              (el.textContent || '').includes('Launch Matrix')
            );
            if (h) {
              h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }, 50);
      } else { // 'guide' (default)
        if (blogSec) blogSec.style.display = 'block';
        if (proofsSec) proofsSec.style.display = 'none';
        if (btnGuide) btnGuide.classList.add('primary');
        if (targetId) {
          setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        } else {
          const blogReader = document.getElementById('hub-blog-reader');
          if (blogReader) {
            const headerOrH1 = blogReader.querySelector('h1') || blogSec;
            if (headerOrH1) headerOrH1.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }

      if (!skipHistoryReplace) {
        try {
          const u = new URL(window.location.href);
          if (mode && mode !== 'guide') {
            u.searchParams.set('view', mode);
            if (targetId) u.searchParams.set('target', targetId);
            else u.searchParams.delete('target');
          } else {
            u.searchParams.delete('view');
            u.searchParams.delete('target');
          }
          history.replaceState(null, '', u.pathname + u.search + u.hash);
        } catch (_) {}
      }
    }
    window.setHubViewMode = setHubViewMode;

    function initDtProofsStudio(targetId) {
      const strip = document.getElementById('dt-target-pill-strip');
      if (strip && strip.children.length === 0) {
        strip.innerHTML = DT_PROOFS_DATA.map((p, idx) => {
          const isAct = p.index === 1 ? ' active' : '';
          return `<button type="button" class="genuine-3p-filter-btn${isAct}" id="dt-pill-btn-${p.index}" onclick="selectDtTarget(${p.index})" style="padding:4px 9px; font-size:11px; white-space:nowrap; border-radius:6px;">SAAS-${String(p.index).padStart(2, '0')}: ${p.true_product_name} (<code>${p.agentcore_target_id}</code>)</button>`;
        }).join('');
      }

      let targetIdx = 1;
      if (targetId) {
        const found = DT_PROOFS_DATA.find(p => p.agentcore_target_id === targetId || p.key === targetId);
        if (found) targetIdx = found.index;
      }
      selectDtTarget(targetIdx);
    }
    window.initDtProofsStudio = initDtProofsStudio;

    function selectDtTarget(idx) {
      dtActiveIndex = idx;
      const data = DT_PROOFS_DATA.find(p => p.index === idx) || DT_PROOFS_DATA[0];

      // Update pills
      DT_PROOFS_DATA.forEach(p => {
        const btn = document.getElementById(`dt-pill-btn-${p.index}`);
        if (btn) {
          if (p.index === idx) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });

      // Update metadata card
      const bSaas = document.getElementById('dt-meta-saas-badge');
      if (bSaas) bSaas.textContent = `SAAS-${String(data.index).padStart(2, '0')}`;
      const cStack = document.getElementById('dt-meta-stack-code');
      if (cStack) cStack.textContent = `${data.true_product_name} ${data.product_version}`;
      const bTarget = document.getElementById('dt-meta-target-badge');
      if (bTarget) bTarget.textContent = `AgentCore Target: ${data.agentcore_target_id}`;
      const mTitle = document.getElementById('dt-meta-title');
      if (mTitle) mTitle.textContent = data.enterprise_saas_domain;
      const mAction = document.getElementById('dt-meta-action');
      if (mAction) mAction.textContent = data.agentic_action_executed;
      const lS3 = document.getElementById('dt-meta-s3-link');
      if (lS3) lS3.href = data.s3_ledger_outcome_url;
      const lRunbook = document.getElementById('dt-meta-runbook-link');
      if (lRunbook) lRunbook.href = 'docs/10-THIRD-PARTY-SAAS-3-PATTERN-MANUAL-TESTING-PLAYBOOK.md';

      // Update spoken transcript
      const transcriptEl = document.getElementById('dt-spoken-transcript-body');
      if (transcriptEl) transcriptEl.textContent = data.spoken_script;

      // Update captions
      const beforeCap = document.getElementById('dt-before-caption-text');
      if (beforeCap) beforeCap.textContent = data.before_summary;
      const afterCap = document.getElementById('dt-after-caption-text');
      if (afterCap) afterCap.textContent = data.after_summary;

      // Reset speech if currently speaking
      if (dtIsSpeaking) {
        stopDigitalTwinAudio();
      }

      renderDtStage();
    }
    window.selectDtTarget = selectDtTarget;

    function setDtSliderViewMode(mode) {
      dtSliderMode = mode;
      const modes = ['slider', 'side-by-side', 'before', 'after'];
      modes.forEach(m => {
        const btn = document.getElementById(`btn-dt-mode-${m === 'side-by-side' ? 'side' : m}`);
        if (btn) {
          if (m === mode) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
      const rangeWrap = document.getElementById('dt-slider-range-wrap');
      if (rangeWrap) {
        rangeWrap.style.display = mode === 'slider' ? 'flex' : 'none';
      }
      renderDtStage();
    }
    window.setDtSliderViewMode = setDtSliderViewMode;

    function updateDtSplitPosition(val) {
      const afterImg = document.getElementById('dt-split-after-img');
      const divider = document.getElementById('dt-split-divider-line');
      if (afterImg) {
        afterImg.style.clipPath = `polygon(${val}% 0, 100% 0, 100% 100%, ${val}% 100%)`;
      }
      if (divider) {
        divider.style.left = `${val}%`;
      }
    }
    window.updateDtSplitPosition = updateDtSplitPosition;

    function renderDtStage() {
      const container = document.getElementById('dt-stage-display-container');
      if (!container) return;
      const data = DT_PROOFS_DATA.find(p => p.index === dtActiveIndex) || DT_PROOFS_DATA[0];

      if (dtSliderMode === 'slider') {
        container.innerHTML = `
          <div style="position:relative; width:100%; aspect-ratio:16/10; max-height:560px; background:#0f172a; border-radius:6px; overflow:hidden; cursor:ew-resize;" onclick="openGenuineScreenshotLightbox('${data.after.rel_path}', '${data.enterprise_saas_domain}')">
            <img src="${data.before.rel_path}" alt="Before" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#f8fafc;" />
            <img id="dt-split-after-img" src="${data.after.rel_path}" alt="After" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#f8fafc; clip-path:polygon(50% 0, 100% 0, 100% 100%, 50% 100%);" />
            <div id="dt-split-divider-line" style="position:absolute; top:0; bottom:0; left:50%; width:3px; background:#3b82f6; box-shadow:0 0 8px rgba(59,130,246,0.8); pointer-events:none;">
              <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:28px; height:28px; border-radius:50%; background:#2563eb; color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.3);">&#8596;</div>
            </div>
            <div style="position:absolute; top:8px; left:8px; background:rgba(239,68,68,0.9); color:#ffffff; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:4px; z-index:2;">&#9203; BEFORE (Unmanaged Baseline)</div>
            <div style="position:absolute; top:8px; right:8px; background:rgba(16,185,129,0.9); color:#ffffff; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:4px; z-index:2;">&#9989; AFTER (Live GEAP Hop 5 Enforced)</div>
          </div>`;
      } else if (dtSliderMode === 'side-by-side') {
        container.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.before.rel_path}', 'BEFORE: ${data.enterprise_saas_domain}')">
              <div style="padding:4px 8px; background:#fff1f2; font-size:10.5px; font-weight:700; color:#9f1239; border-bottom:1px solid #fecdd3;">&#9203; BEFORE (Pre-Agentic Baseline)</div>
              <img src="${data.before.rel_path}" alt="Before" style="width:100%; height:auto; display:block;" />
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.after.rel_path}', 'AFTER: ${data.enterprise_saas_domain}')">
              <div style="padding:4px 8px; background:#ecfdf5; font-size:10.5px; font-weight:700; color:#065f46; border-bottom:1px solid #a7f3d0;">&#9989; AFTER (Live GEAP Hop 5 Mutated)</div>
              <img src="${data.after.rel_path}" alt="After" style="width:100%; height:auto; display:block;" />
            </div>
          </div>`;
      } else if (dtSliderMode === 'before') {
        container.innerHTML = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.before.rel_path}', 'BEFORE: ${data.enterprise_saas_domain}')">
            <div style="padding:4px 8px; background:#fff1f2; font-size:10.5px; font-weight:700; color:#9f1239; border-bottom:1px solid #fecdd3;">&#9203; BEFORE (Pre-Agentic Baseline UI &bull; 2880&times;1800 Retina)</div>
            <img src="${data.before.rel_path}" alt="Before" style="width:100%; height:auto; display:block;" />
          </div>`;
      } else if (dtSliderMode === 'after') {
        container.innerHTML = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.after.rel_path}', 'AFTER: ${data.enterprise_saas_domain}')">
            <div style="padding:4px 8px; background:#ecfdf5; font-size:10.5px; font-weight:700; color:#065f46; border-bottom:1px solid #a7f3d0;">&#9989; AFTER (Live GEAP Hop 5 Mutated UI &bull; 2880&times;1800 Retina)</div>
            <img src="${data.after.rel_path}" alt="After" style="width:100%; height:auto; display:block;" />
          </div>`;
      }
    }
    window.renderDtStage = renderDtStage;

    function toggleDigitalTwinAudio() {
      if (dtIsSpeaking) {
        stopDigitalTwinAudio();
      } else {
        playDigitalTwinAudio();
      }
    }
    window.toggleDigitalTwinAudio = toggleDigitalTwinAudio;

    function playDigitalTwinAudio() {
      const data = DT_PROOFS_DATA.find(p => p.index === dtActiveIndex) || DT_PROOFS_DATA[0];
      const text = data.spoken_script;
      const btn = document.getElementById('dt-audio-toggle-btn');
      const icon = document.getElementById('dt-audio-icon');
      const label = document.getElementById('dt-audio-label');

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        
        // Find best voice match
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (preferred) utter.voice = preferred;

        utter.onstart = () => {
          dtIsSpeaking = true;
          if (btn) btn.classList.add('warn');
          if (icon) icon.textContent = '⏸️';
          if (label) label.textContent = 'Speaking... (Click to Pause)';
        };
        utter.onend = () => {
          stopDigitalTwinAudio();
        };
        utter.onerror = () => {
          stopDigitalTwinAudio();
        };

        dtCurrentUtterance = utter;
        window.speechSynthesis.speak(utter);
      } else {
        if (label) label.textContent = 'Speech synthesis not supported in this browser';
      }
    }
    window.playDigitalTwinAudio = playDigitalTwinAudio;

    function stopDigitalTwinAudio() {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      dtIsSpeaking = false;
      const btn = document.getElementById('dt-audio-toggle-btn');
      const icon = document.getElementById('dt-audio-icon');
      const label = document.getElementById('dt-audio-label');
      if (btn) btn.classList.remove('warn');
      if (icon) icon.textContent = '🔊';
      if (label) label.textContent = "Listen to Architectural Walkthrough";
    }
    window.stopDigitalTwinAudio = stopDigitalTwinAudio;
