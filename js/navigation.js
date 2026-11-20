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
          params.delete('tab');
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
          if (opts.view !== undefined) {
            if (opts.view && opts.view !== 'guide') {
              params.set('view', opts.view);
            } else {
              params.delete('view');
              params.delete('target');
            }
          }
          params.delete('wb');
          params.delete('page');
        } else {
          // When not on patterns tab, remove ws, doc, view, and target unless keepWsDoc is requested
          if (!opts.keepWsDoc) {
            params.delete('ws');
            params.delete('doc');
          }
          params.delete('view');
          params.delete('target');
        }

        // Tab 3 Screenshots / Workbench: sync ?tab=screenshots&wb=...
        if (tab === 'screenshots') {
          if (opts.wb) {
            params.set('wb', opts.wb);
          }
        } else {
          params.delete('wb');
        }

        // Overview / Homepage: strip deep-linking params to ensure clean root URL '/'
        if (tab === 'overview') {
          params.delete('tab');
          params.delete('ws');
          params.delete('doc');
          params.delete('wb');
          params.delete('view');
          params.delete('target');
          if (!opts.keepPage) {
            params.delete('page');
          }
        } else {
          params.delete('page');
        }

        const newQuery = params.toString() ? ('?' + params.toString()) : '';
        let newHash = '';
        if (tab === 'overview') {
          newHash = '';
        } else if (opts.hash !== undefined) {
          newHash = opts.hash ? ('#' + String(opts.hash).replace(/^#/, '')) : '';
        } else {
          newHash = currentUrl.hash || '';
        }

        const targetUrl = (tab === 'overview' && !newQuery && !newHash) ? '/' : (currentUrl.pathname + newQuery + newHash);
        const currentFullUrl = window.location.pathname + window.location.search + window.location.hash;

        const stateObj = {
          tab: tab,
          ws: (tab === 'patterns') ? (params.get('ws') || null) : null,
          doc: (tab === 'patterns') ? (params.get('doc') || null) : null,
          view: (tab === 'patterns') ? (params.get('view') || null) : null,
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

    function navigateToHomepage(btn) {
      const targetBtn = btn || document.getElementById('tab-btn-overview');
      if (typeof switchTab === 'function') {
        switchTab('overview', targetBtn);
      }
      try {
        if (window.location.search || window.location.hash) {
          history.pushState({ tab: 'overview', ws: null, doc: null, wb: null }, '', '/');
        }
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, left: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      } catch (_) {
        window.scrollTo(0, 0);
      }
    }
    window.navigateToHomepage = navigateToHomepage;

    function switchTab(name, btn, skipHistoryPush) {
      if (typeof btn === 'boolean' && skipHistoryPush === undefined) {
        skipHistoryPush = btn;
        btn = null;
      }
      try {
        if (!skipHistoryPush && typeof trackClickstream === 'function') {
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
        const isGovActive = (name === 'forensic' || name === 'changelog');
        govSel.value = isGovActive ? name : '';
        govSel.classList.toggle('active', isGovActive);
        govSel.style.borderColor = isGovActive ? '#1a73e8' : '';
        govSel.style.backgroundColor = isGovActive ? '#e8f0fe' : '';
        govSel.style.color = isGovActive ? '#174ea6' : '';
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
          doc: (name === 'patterns') ? (typeof activeHubDocPath !== 'undefined' ? activeHubDocPath : null) : null,
          hash: ''
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
          if (typeof setHubViewMode === 'function') {
            setHubViewMode(view || 'guide', params.get('target'), true);
          }
        }

        // If on screenshots tab and workbench subtab specified
        if (tab === 'screenshots' && wb && typeof switchE2EWorkbenchTab === 'function') {
          switchE2EWorkbenchTab(wb);
        }

        // If on overview tab and one-pager page specified
        if (tab === 'overview' && typeof window.filterOverviewOnePager === 'function') {
          window.filterOverviewOnePager(page || 'WS1', null, true);
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
      const dirAliases = {
        'core-cymbal-agent': 'core-cymbal-agent/runtime_pipeline.py',
        'core-cymbal-agent/governance': 'core-cymbal-agent/governance/hop1_edge_identity_pep.py',
        'core-cymbal-agent/agents': 'core-cymbal-agent/agents/shared_diagnostic_agent.py',
        'core-cymbal-agent/mcp_servers': 'core-cymbal-agent/mcp_servers/cymbal_mcp_hub.py',
        'diagrams': 'diagrams/ws1-l1-logical-security-taxonomy.drawio',
        'diagrams/vision_metadata': 'diagrams/vision_metadata/ws1-l1-logical-security-taxonomy.vision.json',
        'scripts/blueprints_ext': 'scripts/blueprints_ext/arch_center_blueprints.py',
        'slides': 'slides/slides_manifest.json',
        'workstream-2-pattern-a-pooled/2.3-solution-implementation': 'workstream-2-pattern-a-pooled/2.3-solution-implementation/pooled_agent_service.py',
        'workstream-2-pattern-a-pooled/2.6-terraform-starter': 'workstream-2-pattern-a-pooled/2.6-terraform-starter/main.tf',
        'workstream-3-pattern-b-siloed/3.3-solution-implementation': 'workstream-3-pattern-b-siloed/3.3-solution-implementation/siloed_agent_service.py',
        'workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint': 'workstream-3-pattern-b-siloed/3.6-terraform-silo-blueprint/main.tf',
        'workstream-4-pattern-c-hybrid': 'workstream-4-pattern-c-hybrid/4.1-case-study-and-solution-architecture.md',
        'workstream-4-pattern-c-hybrid/4.3-solution-implementation': 'workstream-4-pattern-c-hybrid/4.3-solution-implementation/hybrid_router_service.py',
        'workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite': 'workstream-4-pattern-c-hybrid/4.5-zero-downtime-tier-upgrade-suite/tier_migration_orchestrator.py',
        'workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint': 'workstream-4-pattern-c-hybrid/4.6-terraform-hybrid-psc-blueprint/main.tf'
      };
      if (dirAliases[clean]) {
        clean = dirAliases[clean];
      } else if (clean.endsWith('2.6-terraform-starter') || clean.endsWith('3.6-terraform-silo-blueprint') || clean.endsWith('4.6-terraform-hybrid-psc-blueprint')) {
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
      if (anchor.startsWith('tab-patterns?')) {
        const qs = new URLSearchParams(anchor.slice('tab-patterns?'.length));
        const viewMode = qs.get('view') || 'proofs';
        const targetId = qs.get('target') || '';
        const patternsTab = document.getElementById('tab-patterns');
        if (patternsTab && patternsTab.style.display === 'none') {
          switchTab('patterns', document.getElementById('tab-btn-patterns'));
        }
        setHubViewMode(viewMode, targetId);
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
    "key": "thoughtspot",
    "enterprise_saas_domain": "ThoughtSpot Cloud (Spotter Agentic BI)",
    "agentcore_target_id": "HXGGFMZBKE",
    "mcp_tool_name": "query_thoughtspot_liveboard_rls",
    "true_product_name": "ThoughtSpot Cloud",
    "product_version": "Commercial Cloud",
    "provisioning_channel": "Google Cloud Marketplace / Commercial Free Trial",
    "billing_mode": "Free Trial (Active)",
    "marketplace_url": "https://console.cloud.google.com/marketplace/product/thoughtspot-public/thoughtspot-enterprise-saas-gcp?project=ramp-portal-dev",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/thoughtspot-spotter?format=json",
    "before_summary": "Live ThoughtSpot Cloud Executive Analytics Liveboard captured from team2.thoughtspot.cloud with cryptographic SHA-256 provenance.",
    "agentic_action_executed": "GEAP MCP tool query_thoughtspot_liveboard_rls (Target HXGGFMZBKE) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Live ThoughtSpot Cloud Saved Answer analytics table proving governed multi-tenant BI query execution on team2.thoughtspot.cloud.",
    "has_live_capture": true,
    "before": {
      "filename": "saas_01_thoughtspot_liveboard.png",
      "rel_path": "screenshots/verified-cloud-console/saas_01_thoughtspot_liveboard.png",
      "http_status": 200,
      "page_title": "ThoughtSpot Cloud \u2014 Live Executive Analytics Liveboard",
      "width": 2880,
      "height": 1620,
      "sha256": "991fad856c6e38b0f12854369c0251aed9ec5b50d2eff8b79eef89a8a0fd5489"
    },
    "after": {
      "filename": "saas_02_thoughtspot_saved_answer.png",
      "rel_path": "screenshots/verified-cloud-console/saas_02_thoughtspot_saved_answer.png",
      "http_status": 200,
      "page_title": "ThoughtSpot Cloud \u2014 Live Governed Saved Answer Query",
      "width": 2880,
      "height": 1620,
      "sha256": "3590f8609f885929da9c7fdf1db2065a2f3a54e9dfa56d8db2ca715c631ed74a"
    },
    "spoken_script": "In this commercial BI verification view, ThoughtSpot Cloud runs directly on team2.thoughtspot.cloud. Hop 1 propagates the verified tenant identity and Hop 5 enforces tenant row-level security across liveboard and saved answer queries via AgentCore target HXGGFMZBKE."
  },
  {
    "index": 2,
    "key": "sigma",
    "enterprise_saas_domain": "Sigma Computing (Cloud BI Workbooks)",
    "agentcore_target_id": "IZVODT083Q",
    "mcp_tool_name": "eval_sigma_workbook_rls",
    "true_product_name": "Sigma Computing",
    "product_version": "Commercial Free Trial",
    "provisioning_channel": "Direct Commercial Free Trial (14-Day)",
    "billing_mode": "Free Trial",
    "marketplace_url": "https://www.sigmacomputing.com/free-trial",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/sigma-computing?format=json",
    "before_summary": "Commercial Sigma Computing 14-day Free Trial workbook awaiting interactive signup in an authenticated browser session.",
    "agentic_action_executed": "GEAP MCP tool eval_sigma_workbook_rls (Target IZVODT083Q) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Once signed in, verified 16:9 Retina Sigma Cloud workbook proofs attach automatically.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Sigma Computing executes tenant-scoped cloud workbooks through AgentCore target IZVODT083Q with user-attribute claims preventing cross-tenant workbook tampering."
  },
  {
    "index": 3,
    "key": "servicenow",
    "enterprise_saas_domain": "ServiceNow ITSM & ITOM",
    "agentcore_target_id": "ZS9VGYHBQL",
    "mcp_tool_name": "query_servicenow_change_records",
    "true_product_name": "ServiceNow ITSM & ITOM",
    "product_version": "Personal Developer Instance",
    "provisioning_channel": "ServiceNow Personal Developer Instance (PDI)",
    "billing_mode": "Free Developer Plan",
    "marketplace_url": "https://developer.servicenow.com/",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/servicenow-itsm?format=json",
    "before_summary": "Commercial ServiceNow Personal Developer Instance (PDI) awaiting interactive signup in an authenticated browser session.",
    "agentic_action_executed": "GEAP MCP tool query_servicenow_change_records (Target ZS9VGYHBQL) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Verified ServiceNow ITSM change workspace screenshots attach automatically after PDI sign-in.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "ServiceNow ITSM change automation runs under DPoP-bound 3LO OAuth tokens through AgentCore target ZS9VGYHBQL, scoping every ticket mutation to the calling tenant."
  },
  {
    "index": 4,
    "key": "veeva",
    "enterprise_saas_domain": "Veeva Vault RIM (21 CFR Part 11 GxP)",
    "agentcore_target_id": "TWQU0KSRVF",
    "mcp_tool_name": "sync_clinical_trial_edc_cohort",
    "true_product_name": "Veeva Vault RIM",
    "product_version": "Enterprise MSA Only",
    "provisioning_channel": "Enterprise Sales-Assisted Only (No Self-Service Marketplace Trial) \u2014 Backed by GCP Integration Connectors",
    "billing_mode": "Enterprise MSA Only",
    "marketplace_url": "https://console.cloud.google.com/integration-connectors/connections?project=ramp-portal-dev",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/muse-poc?format=json",
    "before_summary": "Veeva Vault RIM requires an enterprise MSA (no public self-service trial) and is governed via Google Cloud Integration Connectors.",
    "agentic_action_executed": "GEAP MCP tool sync_clinical_trial_edc_cohort (Target TWQU0KSRVF) enforces Hop 1-5 tenant isolation.",
    "after_summary": "GCP Integration Connectors Console capture in ramp-portal-dev provides control-plane proof once GCP SSO completes.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Veeva Vault RIM enforces 21 CFR Part 11 GxP electronic signatures via Cloud KMS ECDSA keys and Google Cloud Integration Connectors under AgentCore target TWQU0KSRVF."
  },
  {
    "index": 5,
    "key": "salesforce-jira",
    "enterprise_saas_domain": "Atlassian Jira Cloud & Salesforce Developer Edition",
    "agentcore_target_id": "K5JAEFCQ6E",
    "mcp_tool_name": "create_redacted_sfdc_jira_escalation",
    "true_product_name": "Atlassian Jira Cloud & Salesforce Developer Edition",
    "product_version": "Free Cloud / Dev Edition",
    "provisioning_channel": "Atlassian Free Cloud Plan + Salesforce Developer Edition",
    "billing_mode": "Free Plan / Dev Edition",
    "marketplace_url": "https://developer.salesforce.com/signup",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/salesforce-jira?format=json",
    "before_summary": "Commercial Atlassian Jira Cloud Free Plan and Salesforce Developer Edition orgs ready for interactive browser signup.",
    "agentic_action_executed": "GEAP MCP tool create_redacted_sfdc_jira_escalation (Target K5JAEFCQ6E) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Verified Jira Cloud and Salesforce Lightning captures attach automatically after interactive signup.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Cross-system Salesforce and Jira escalations pass through Hop 4 Cloud SDP PII redaction before writing case context via AgentCore target K5JAEFCQ6E."
  },
  {
    "index": 6,
    "key": "databricks",
    "enterprise_saas_domain": "Databricks Data Intelligence (Unity Catalog)",
    "agentcore_target_id": "TERCK8SLBP",
    "mcp_tool_name": "execute_uc_genie_federated_sql",
    "true_product_name": "Databricks Data Intelligence",
    "product_version": "GCP Marketplace Trial / PAYG",
    "provisioning_channel": "Google Cloud Marketplace (ramp-portal-dev)",
    "billing_mode": "14-Day Free Trial / PAYG",
    "marketplace_url": "https://console.cloud.google.com/marketplace/product/databricks-prod/databricks?project=ramp-portal-dev",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/databricks-unity?format=json",
    "before_summary": "Databricks on Google Cloud Marketplace (14-Day Free Trial / PAYG) ready for interactive browser provisioning.",
    "agentic_action_executed": "GEAP MCP tool execute_uc_genie_federated_sql (Target TERCK8SLBP) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Verified Unity Catalog SQL warehouse screenshots attach automatically after GCP SSO and Marketplace provisioning.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Databricks Unity Catalog federated SQL executes with tenant-scoped principal attribution through AgentCore target TERCK8SLBP."
  },
  {
    "index": 7,
    "key": "snowflake",
    "enterprise_saas_domain": "Snowflake AI Data Cloud (Cortex SQL)",
    "agentcore_target_id": "CCMDEVZV2S",
    "mcp_tool_name": "execute_cortex_analyst_sql",
    "true_product_name": "Snowflake AI Data Cloud",
    "product_version": "GCP Marketplace Trial / PAYG",
    "provisioning_channel": "Google Cloud Marketplace (ramp-portal-dev)",
    "billing_mode": "30-Day Free Trial / PAYG",
    "marketplace_url": "https://console.cloud.google.com/marketplace/browse?q=Snowflake&project=ramp-portal-dev",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/snowflake-cortex?format=json",
    "before_summary": "Snowflake AI Data Cloud on Google Cloud Marketplace (30-Day Free Trial / PAYG) ready for interactive browser provisioning.",
    "agentic_action_executed": "GEAP MCP tool execute_cortex_analyst_sql (Target CCMDEVZV2S) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Verified Snowsight Cortex SQL screenshots attach automatically after GCP SSO and Marketplace provisioning.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Snowflake Cortex Analyst executes row-level secured analytical queries under per-tenant CMEK keys via AgentCore target CCMDEVZV2S."
  },
  {
    "index": 8,
    "key": "workday",
    "enterprise_saas_domain": "Workday Enterprise HCM & RaaS",
    "agentcore_target_id": "RAOTMUMJTZ",
    "mcp_tool_name": "fetch_compensation_raas_report",
    "true_product_name": "Workday Enterprise HCM & RaaS",
    "product_version": "Enterprise MSA Only",
    "provisioning_channel": "Enterprise Sales-Assisted Only (No Self-Service Marketplace Trial) \u2014 Backed by GCP Integration Connectors",
    "billing_mode": "Enterprise MSA Only",
    "marketplace_url": "https://console.cloud.google.com/integration-connectors/connections?project=ramp-portal-dev",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/workday-raas?format=json",
    "before_summary": "Workday Enterprise HCM requires an enterprise MSA (no public self-service trial) and is governed via Google Cloud Integration Connectors.",
    "agentic_action_executed": "GEAP MCP tool fetch_compensation_raas_report (Target RAOTMUMJTZ) enforces Hop 1-5 tenant isolation.",
    "after_summary": "GCP Integration Connectors Console capture in ramp-portal-dev provides control-plane proof once GCP SSO completes.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Workday RaaS HCM reports enforce principal-scoped 3LO access and Hop 4 SSN/compensation redaction via AgentCore target RAOTMUMJTZ."
  },
  {
    "index": 9,
    "key": "datadog",
    "enterprise_saas_domain": "Datadog Cloud Observability & Bits AI SRE",
    "agentcore_target_id": "G767QR3TQZ",
    "mcp_tool_name": "query_tenant_apm_logs",
    "true_product_name": "Datadog Cloud Observability & Bits AI SRE",
    "product_version": "GCP Marketplace Trial / PAYG",
    "provisioning_channel": "Google Cloud Marketplace (ramp-portal-dev)",
    "billing_mode": "14-Day Free Trial / PAYG",
    "marketplace_url": "https://console.cloud.google.com/marketplace/browse?q=Datadog&project=ramp-portal-dev",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/datadog-sre?format=json",
    "before_summary": "Datadog on Google Cloud Marketplace (14-Day Free Trial / PAYG) ready for interactive browser signup.",
    "agentic_action_executed": "GEAP MCP tool query_tenant_apm_logs (Target G767QR3TQZ) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Verified Datadog APM and Log Explorer screenshots attach automatically after GCP SSO and Marketplace signup.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Datadog Cloud Observability ingests zero-PII OpenTelemetry spans scrubbed by Hop 4 Model Armor and attributed via AgentCore target G767QR3TQZ."
  },
  {
    "index": 10,
    "key": "okta-crowdstrike",
    "enterprise_saas_domain": "Okta Workforce Identity & CrowdStrike Falcon XDR",
    "agentcore_target_id": "C7EYM614F2",
    "mcp_tool_name": "contain_xdr_host_with_dpop",
    "true_product_name": "Okta Workforce Identity & CrowdStrike Falcon XDR",
    "product_version": "Integrator Free / Trial",
    "provisioning_channel": "Okta Integrator Free Plan / CrowdStrike Free Trial",
    "billing_mode": "Free Developer / Trial",
    "marketplace_url": "https://developer.okta.com/signup/",
    "s3_ledger_outcome_url": "https://t2zbugodcr2m7aimjudycgm65q0wopps.lambda-url.us-east-1.on.aws/saas-ui/crowdstrike-okta?format=json",
    "before_summary": "Okta Integrator Free Plan and CrowdStrike Falcon 15-Day Free Trial ready for interactive browser tenant signup.",
    "agentic_action_executed": "GEAP MCP tool contain_xdr_host_with_dpop (Target C7EYM614F2) enforces Hop 1-5 tenant isolation.",
    "after_summary": "Verified Okta / CrowdStrike admin screenshots attach automatically after signup.",
    "has_live_capture": false,
    "before": null,
    "after": null,
    "spoken_script": "Okta Workforce Identity and CrowdStrike Falcon XDR containment execute under DPoP-bound sovereign tokens and Cloud KMS revocation via AgentCore target C7EYM614F2."
  }
];
    let dtActiveIndex = 1;
    let dtSliderMode = 'slider';
    let dtIsSpeaking = false;
    let dtCurrentUtterance = null;

    function isEapSectionTitle(txt) {
      const s = String(txt || '');
      return /Compensating controls|\bEAP\b|Early Access Program|Design considerations|Security, privacy|Architectural caveats|Operational nuances|Cost optimization|Capstone backlog|GA roadmap|Production hardening|FinOps|Chargeback/i.test(s);
    }
    window.isEapSectionTitle = isEapSectionTitle;

    function isDeliverablesSectionTitle(txt) {
      const s = String(txt || '');
      return /What['’]s next|Deliverables|Launch Matrix|Next steps|Deployment|Terraform|Verification|Manual Testing|Runbook/i.test(s);
    }
    window.isDeliverablesSectionTitle = isDeliverablesSectionTitle;

    function handleHubViewModeSelect(val) {
      if (val && val.startsWith('DOC:')) {
        const docPath = val.slice(4);
        if (typeof window.openDocInReader === 'function') {
          window.openDocInReader(docPath);
        }
        return;
      }
      if (val === 'blank-canvas') {
        if (typeof window.insertBlankDiagramCanvasInBlog === 'function') {
          window.insertBlankDiagramCanvasInBlog();
        }
        const sel = document.getElementById('hub-view-mode-select');
        if (sel) sel.value = 'guide';
        return;
      }
      if (val === 'atlas') {
        if (typeof window.switchTab === 'function') {
          window.switchTab('diagrams', document.getElementById('tab-btn-diagrams'));
        }
        const sel = document.getElementById('hub-view-mode-select');
        if (sel) sel.value = 'guide';
        return;
      }
      if (val === 'workbench-codebase') {
        openWorkbenchView('codebase');
        const sel = document.getElementById('hub-view-mode-select');
        if (sel) sel.value = 'guide';
        return;
      }
      if (val === 'workbench-terraform') {
        openWorkbenchView('deliverables', 'terraform');
        const sel = document.getElementById('hub-view-mode-select');
        if (sel) sel.value = 'guide';
        return;
      }
      setHubViewMode(val);
    }
    window.handleHubViewModeSelect = handleHubViewModeSelect;

    function setHubViewMode(mode, targetId, skipHistoryReplace) {
      const blogSec = document.getElementById('hub-blog-section');
      const proofsSec = document.getElementById('hub-proofs-section');
      const btnGuide = document.getElementById('btn-view-mode-guide');
      const btnEap = document.getElementById('btn-view-mode-eap');
      const btnProofs = document.getElementById('btn-view-mode-proofs');
      const btnDeliverables = document.getElementById('btn-view-mode-deliverables');
      const selMode = document.getElementById('hub-view-mode-select');
      if (selMode && ['guide', 'eap', 'proofs', 'deliverables'].includes(mode || 'guide')) {
        selMode.value = mode || 'guide';
      }

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
            const headings = Array.from(readerEl.querySelectorAll('h2, h3'));
            const h2s = Array.from(readerEl.querySelectorAll('h2'));
            const h = headings.find(el => /Compensating controls|\bEAP\b|Early Access Program/i.test(el.textContent || ''))
              || headings.find(el => isEapSectionTitle(el.textContent || ''))
              || h2s[Math.min(1, Math.max(0, h2s.length - 1))]
              || headings[0];
            if (h) {
              h.scrollIntoView({ behavior: 'smooth', block: 'start' });
              const tocLinks = Array.from(document.querySelectorAll('#hub-blog-toc .series-toc-link'));
              const matchedIdx = tocLinks.findIndex(a => isEapSectionTitle(a.textContent || ''));
              tocLinks.forEach((a, idx) => a.classList.toggle('active', matchedIdx >= 0 ? idx === matchedIdx : idx === Math.min(1, tocLinks.length - 1)));
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
            const headings = Array.from(readerEl.querySelectorAll('h2, h3'));
            const h2s = Array.from(readerEl.querySelectorAll('h2'));
            const h = headings.find(el => /What['’]s next|Deliverables|Launch Matrix|Next steps/i.test(el.textContent || ''))
              || headings.find(el => isDeliverablesSectionTitle(el.textContent || ''))
              || headings.find(el => /Products used/i.test(el.textContent || ''))
              || h2s[h2s.length - 1]
              || headings[headings.length - 1];
            if (h) {
              h.scrollIntoView({ behavior: 'smooth', block: 'start' });
              const tocLinks = Array.from(document.querySelectorAll('#hub-blog-toc .series-toc-link'));
              const matchedIdx = tocLinks.findIndex(a => isDeliverablesSectionTitle(a.textContent || ''));
              tocLinks.forEach((a, idx) => a.classList.toggle('active', matchedIdx >= 0 ? idx === matchedIdx : idx === tocLinks.length - 1));
            }
          }
        }, 50);
      } else { // 'guide' (default)
        if (blogSec) blogSec.style.display = 'block';
        if (proofsSec) proofsSec.style.display = 'none';
        if (btnGuide) btnGuide.classList.add('primary');
        const tocLinks = document.querySelectorAll('#hub-blog-toc .series-toc-link');
        if (targetId) {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            tocLinks.forEach(a => a.classList.toggle('active', (a.textContent || '').trim() === (targetEl.textContent || '').trim()));
          }
          setTimeout(() => {
            const el = document.getElementById(targetId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        } else {
          tocLinks.forEach((a, idx) => a.classList.toggle('active', idx === 0));
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
          const prevView = u.searchParams.get('view') || 'guide';
          const nextView = (mode && mode !== 'guide') ? mode : 'guide';
          if (nextView !== 'guide') {
            u.searchParams.set('view', nextView);
            if (targetId) u.searchParams.set('target', targetId);
            else u.searchParams.delete('target');
          } else {
            u.searchParams.delete('view');
            u.searchParams.delete('target');
          }
          const stateObj = {
            tab: getActivePortalTabName(),
            ws: u.searchParams.get('ws') || null,
            doc: u.searchParams.get('doc') || null,
            view: u.searchParams.get('view') || null,
            wb: null
          };
          const nextUrl = u.pathname + u.search + u.hash;
          if (prevView !== nextView && (prevView === 'proofs' || nextView === 'proofs')) {
            history.pushState(stateObj, '', nextUrl);
          } else {
            history.replaceState(stateObj, '', nextUrl);
          }
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
      const dtSel = document.getElementById('dt-target-select');
      if (dtSel && dtSel.options.length === 0) {
        dtSel.innerHTML = DT_PROOFS_DATA.map(p =>
          `<option value="${p.index}">SAAS-${String(p.index).padStart(2, '0')}: ${p.true_product_name} — ${p.enterprise_saas_domain} (${p.agentcore_target_id})</option>`
        ).join('');
      }

      let targetIdx = 1;
      if (targetId) {
        const found = DT_PROOFS_DATA.find(p => p.agentcore_target_id === targetId || p.key === targetId);
        if (found) targetIdx = found.index;
      }
      selectDtTarget(targetIdx);
    }
    window.initDtProofsStudio = initDtProofsStudio;

    function filterDtTargetOptions(q) {
      const clean = String(q || '').trim().toLowerCase();
      const dtSel = document.getElementById('dt-target-select');
      if (!dtSel) return;
      const matches = DT_PROOFS_DATA.filter(p => {
        if (!clean) return true;
        const hay = `${p.true_product_name} ${p.enterprise_saas_domain} ${p.agentcore_target_id} ${p.mcp_tool_name} saas-${String(p.index).padStart(2, '0')}`.toLowerCase();
        return hay.includes(clean);
      });
      const listToRender = matches.length > 0 ? matches : DT_PROOFS_DATA;
      dtSel.innerHTML = listToRender.map(p =>
        `<option value="${p.index}">SAAS-${String(p.index).padStart(2, '0')}: ${p.true_product_name} — ${p.enterprise_saas_domain} (${p.agentcore_target_id})</option>`
      ).join('');
      if (matches.length > 0 && !matches.some(m => m.index === dtActiveIndex)) {
        selectDtTarget(matches[0].index);
      } else {
        dtSel.value = String(dtActiveIndex);
      }
    }
    window.filterDtTargetOptions = filterDtTargetOptions;

    function selectDtTarget(idx) {
      dtActiveIndex = Number(idx) || 1;
      const data = DT_PROOFS_DATA.find(p => p.index === dtActiveIndex) || DT_PROOFS_DATA[0];
      const dtSel = document.getElementById('dt-target-select');
      if (dtSel && String(dtSel.value) !== String(data.index)) {
        dtSel.value = String(data.index);
      }

      // Update pills
      DT_PROOFS_DATA.forEach(p => {
        const btn = document.getElementById(`dt-pill-btn-${p.index}`);
        if (btn) {
          if (p.index === dtActiveIndex) btn.classList.add('active');
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
      const dtDispSel = document.getElementById('dt-display-mode-select');
      if (dtDispSel && dtDispSel.value !== mode) dtDispSel.value = mode;
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
      const safeTitle = String(data.enterprise_saas_domain || '').replace(/'/g, "\\'");

      if (!data.before || !data.after) {
        container.innerHTML = `
          <div style="background:#f8fafc; border:1.5px dashed #93c5fd; border-radius:8px; padding:24px 20px; text-align:left; color:#1e293b;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
              <span class="badge badge-blue text-2xs">${escapeHtml(data.billing_mode || 'Marketplace / Trial')}</span>
              <code style="font-size:11px; color:#475569;">Target ${escapeHtml(data.agentcore_target_id)}</code>
            </div>
            <strong style="font-size:14.5px; color:#0f172a; display:block; margin-bottom:6px;">Live Commercial SaaS Capture Pending Interactive Trial / SSO</strong>
            <p style="margin:0 0 10px 0; font-size:12.5px; color:#334155; line-height:1.5;">
              Zero open-source stand-ins or synthetic HTML screenshots are permitted (enforced fail-closed by <code>F-13</code>).
              Provisioning channel: <strong>${escapeHtml(data.provisioning_channel || 'Google Cloud Marketplace')}</strong>.
            </p>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <a class="sim-btn primary" style="font-size:11.5px; padding:5px 10px; text-decoration:none;" href="${escapeHtml(data.marketplace_url || '/blogs/atlas/screenshots')}" target="_blank" rel="noopener noreferrer">Open Marketplace / Trial &nearr;</a>
              <a class="sim-btn" style="font-size:11.5px; padding:5px 10px; text-decoration:none;" href="/blogs/atlas/screenshots" target="_blank" rel="noopener noreferrer">Open Verified Retina Atlas &nearr;</a>
            </div>
          </div>`;
        return;
      }

      if (dtSliderMode === 'slider') {
        container.innerHTML = `
          <div style="border:1px solid #cbd5e1; border-radius:6px; overflow:hidden; background:#f8fafc;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:5px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; flex-wrap:wrap;">
              <span style="background:#1d4ed8; color:#ffffff; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:4px;">&#9989; LIVE VIEW 1 (Commercial Liveboard)</span>
              <span style="font-size:10.5px; color:#475569; font-weight:600;">Click canvas to zoom &bull; Drag slider below to compare</span>
              <span style="background:#059669; color:#ffffff; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:4px;">&#9989; LIVE VIEW 2 (Governed Saved Answer)</span>
            </div>
            <div style="position:relative; width:100%; aspect-ratio:16/9; max-height:560px; background:#f8fafc; overflow:hidden; cursor:ew-resize;" onclick="openGenuineScreenshotLightbox('${data.after.rel_path}', '${safeTitle}')">
              <img src="${data.before.rel_path}" alt="${escapeHtml(data.before.page_title || 'Live View 1')}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#f8fafc;" />
              <img id="dt-split-after-img" src="${data.after.rel_path}" alt="${escapeHtml(data.after.page_title || 'Live View 2')}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#f8fafc; clip-path:polygon(50% 0, 100% 0, 100% 100%, 50% 100%);" />
              <div id="dt-split-divider-line" style="position:absolute; top:0; bottom:0; left:50%; width:3px; background:#3b82f6; box-shadow:0 0 8px rgba(59,130,246,0.8); pointer-events:none;">
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:28px; height:28px; border-radius:50%; background:#2563eb; color:#ffffff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; border:2px solid #ffffff; box-shadow:0 2px 6px rgba(0,0,0,0.3);">&#8596;</div>
              </div>
            </div>
          </div>`;
      } else if (dtSliderMode === 'side-by-side') {
        container.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.before.rel_path}', 'LIVE VIEW 1: ${safeTitle}')">
              <div style="padding:4px 8px; background:#eff6ff; font-size:10.5px; font-weight:700; color:#1d4ed8; border-bottom:1px solid #bfdbfe;">&#9989; LIVE VIEW 1 (Commercial Liveboard)</div>
              <img src="${data.before.rel_path}" alt="Live View 1" style="width:100%; aspect-ratio:16/9; object-fit:contain; background:#f8fafc; display:block;" />
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.after.rel_path}', 'LIVE VIEW 2: ${safeTitle}')">
              <div style="padding:4px 8px; background:#ecfdf5; font-size:10.5px; font-weight:700; color:#065f46; border-bottom:1px solid #a7f3d0;">&#9989; LIVE VIEW 2 (Governed Saved Answer)</div>
              <img src="${data.after.rel_path}" alt="Live View 2" style="width:100%; aspect-ratio:16/9; object-fit:contain; background:#f8fafc; display:block;" />
            </div>
          </div>`;
      } else if (dtSliderMode === 'before') {
        container.innerHTML = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.before.rel_path}', 'LIVE VIEW 1: ${safeTitle}')">
            <div style="padding:4px 8px; background:#eff6ff; font-size:10.5px; font-weight:700; color:#1d4ed8; border-bottom:1px solid #bfdbfe;">&#9989; LIVE VIEW 1 &bull; 16:9 Retina Verified</div>
            <img src="${data.before.rel_path}" alt="Live View 1" style="width:100%; aspect-ratio:16/9; object-fit:contain; background:#f8fafc; display:block;" />
          </div>`;
      } else {
        container.innerHTML = `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden; cursor:zoom-in;" onclick="openGenuineScreenshotLightbox('${data.after.rel_path}', 'LIVE VIEW 2: ${safeTitle}')">
            <div style="padding:4px 8px; background:#ecfdf5; font-size:10.5px; font-weight:700; color:#065f46; border-bottom:1px solid #a7f3d0;">&#9989; LIVE VIEW 2 &bull; 16:9 Retina Verified</div>
            <img src="${data.after.rel_path}" alt="Live View 2" style="width:100%; aspect-ratio:16/9; object-fit:contain; background:#f8fafc; display:block;" />
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

    // Automatically close open details.export-dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('details.export-dropdown')) {
        document.querySelectorAll('details.export-dropdown[open]').forEach((el) => {
          el.removeAttribute('open');
        });
      }
    });
