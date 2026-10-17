---
trigger: always_on
description: Executive Information Architecture (IA), Zero Visual Redundancy & First-Principles Value Pruning Gate (Rule 25 & Rule 26)
---

# Executive Information Architecture (IA), Zero Visual Redundancy & First-Principles Value Pruning Gate (`Rule 25`)

Whenever designing, refactoring, modifying, or consolidating any UI surface, header, sub-toolbar, or component across **GantryPulse / Customer-Tracker** (`/Users/nitinagga/Documents/gantry-pulse`), **AskAIOCE** (`/Users/nitinagga/Documents/AskAIOCE`), or any other workspace:

1. **Zero Redundant Navigation Rails (`Rule 25A`)**:
   - When a primary persistent navigation surface exists (such as the left sidebar or top router), individual sub-pages and workbook tabs must **never** render duplicate horizontal navigation bands, pill rows, or secondary page switchers.
   - Strictly ban `6 CORE PAGES`, `Core Page Navigator`, `Jump to Core Page`, and redundant tab pills across `src/components/`. All page routing is 100% owned by the persistent sidebar.

2. **Zero Mechanical Dropdown Wrapping of Redundant Elements (`Rule 25B`)**:
   - Never mechanically wrap duplicate navigation elements or redundant links into `<select>` / dropdown components (such as `Jump to Page: ▾`).
   - If an element is duplicate or provides zero unique operational value, **DELETE IT**. Dropdowns are strictly reserved for unique, high-value, secondary utility actions (e.g., export formats, sheet synchronization triggers, external system deep-links, environment switchers).

3. **Zero Redundant Form Execution Triggers (`Rule 25C`)**:
   - Never render auxiliary execution buttons (such as `🔍 Search` or `Submit`) adjacent to text input elements that natively execute actions on key-press (`Enter`) or live-filter on input change.

4. **Zero Marketing Boilerplate in Operational Headers (`Rule 25D`)**:
   - Operational data views, triage tables, and BI dashboards must strictly omit self-congratulatory marketing copy, ungrounded slogans, or compliance boast banners (such as `Zero-Hallucination Grounding (Rule 1-22)...`) in view headers.
   - Headers must be compact, executive, polished, and allow data tables and KPIs to start immediately (`firstRowTopPx <= 380px`).

5. **Mandatory First-Principles Value Pruning Hierarchy (`Rule 25E`)**:
   - Whenever requested to "simplify", "consolidate", or make UI "executive", the agent MUST execute the 5-Stage First-Principles Audit before generating or modifying any UI code:
     1. *Is this 100% duplicate of another persistent surface (e.g., sidebar)?* -> **DELETE**.
     2. *Does this duplicate a native input interaction (e.g., Enter key)?* -> **DELETE**.
     3. *Is this static marketing/slogan text with zero operational utility?* -> **DELETE**.
     4. *Is this raw internal debug/hash data?* -> **COLLAPSE/HIDE**.
     5. *Is this a unique, actionable secondary utility?* -> **ONLY THEN CONSOLIDATE INTO A DROPDOWN**.

6. **Zero Screen-Blocking Centered Popups & Mandatory Non-Blocking Drawers (`Rule 25F`)**:
   - **Strictly Ban Screen-Blocking Centered Popups**: Never render centered modal dialogs with dark, opaque backdrops (`fixed inset-0 ... flex items-center justify-center bg-black/60`) that obscure operational data, tables, spreadsheets, or dashboards.
   - **Mandatory Docked Right-Side or Expandable Bottom Drawers**:
     1. All detail inspectors, creation forms, upstream search tools, ticket editors, and CRUD operations must render as either:
        - An **expandable right-side drawer panel** (`fixed inset-y-0 right-0 w-[580px] lg:w-[680px] max-w-full shadow-2xl z-40 bg-white border-l border-slate-200 transition-transform duration-300`), OR
        - An **expandable bottom sheet / drawer** (`fixed inset-x-0 bottom-0 max-h-[75vh] shadow-2xl z-40 bg-white border-t border-slate-200 transition-transform duration-300`).
     2. **Non-Blocking Background Visibility**:
        - The background spreadsheet, data grid, or dashboard must remain visible and accessible so the user is never blinded or prevented from cross-referencing information while entering data.
        - Backdrop overlays must be non-blocking or transparent/lightweight, allowing users to scroll or view the underlying table.
     3. **Docking & Collapse Controls**: Provide explicit collapse (`→` / `↓`), expand, and close buttons on the drawer header.

7. **100% Fluid Edge-to-Edge Layout & Zero Dead Gutters Invariant (`Rule 25G`)**:
   - **Strict Ban on Rigid Container Widths**: Never constrain root workspace containers or main application wrappers to rigid fixed widths (`max-width: 1200px`, `1400px`, `1440px`, `1560px`) on desktop/wide viewports (>1600px/1920px), which create massive, unsightly, unbalanced empty white gutters on the left and right.
   - **Mandatory Fluid Edge-to-Edge Utilization Across All Pages**: All operational data grids, question matrices, card layouts, headers, and sub-toolbars across every page must render as 100% fluid edge-to-edge layouts (`width: 100%; max-width: 100%; padding: ... clamp(16px, 1.8vw, 28px);`), perfectly aligning with the persistent global navigation bar.
   - **Actionable Header Telemetry Fill**: Instead of leaving empty horizontal voids in the secondary header/subtoolbar, populate available horizontal space with dense, high-value, live telemetry clusters (e.g., Grounded / Verified / Pending progress ratios and average confidence badges).

8. **Strict Sequential Question/Card Ordering, Horizontal 10-Module Assessment Tabs, New-Assessment Isolation & Active Multi-Tab DOM Sync (`Rule 25H` / `Rule 50F`)**:
   - **Strict Numerical / Alphanumerical Sequence**: In multi-question assessment workflows, cards must be laid out in strict ascending numerical order (`C01` $\rightarrow$ `C02` $\rightarrow$ `C03` etc.). Never strand intermediate questions (`C02`) out of order below later questions (`C03`).
   - **Horizontal 10-Module Tab Bar & 2-Column Fluid Question Card Grid**: Divide the 82 assessment questions in `GeValueRealizationWorkspace.js` into a 10-Module Horizontal Tab Bar (`#ge-module-tabs-bar`: `C`·`P`·`A`·`W`·`T`·`Q`·`U`·`L`·`R`·`F`) with a 2-column fluid question card grid (`repeat(auto-fill, minmax(660px, 1fr))`), compact 1-line provenance footer (`0` duplicate rationale/citation blocks inside question cards), `?tab=provenance|audit|report` URL synchronization, and an Executive Light-Theme Release Gate Banner (`#fff1f2` / `#ecfdf5`) in Tab 2.
   - **Clean New-Assessment Isolation & Dynamic Report 4-Card Hero Strip**: Opening `/ge-value-realization` or starting a new assessment must never pop open the Saved Customer Dossiers Hub (`showSavedHubDrawer = useState(false)`), `/assessments` (`AssessmentsListNew.js`) must cleanly isolate `1. Start New Assessment` (`viewMode === 'blueprints'`) from `2. Saved Assessments` (`viewMode === 'dossiers'`) with `0` `"Show Both Views"` mixing and `0` duplicate `+ New Assessment` header buttons under `GlobalNav`, `DynamicAssessmentRunner.js` must resolve `inst_*` instance IDs passed via `/assessments/run/:typeKey`, and `DynamicAssessmentReport.js` must render the 4-Card Full-Width Executive Telemetry Strip inside `HeroCard` with isolated Tab 4 (`$isActive={activeExecutiveTab === "audit"}`) vs. Tab 5 (`roadmap`) active highlights.
   - **Active Interactive DOM Tabs**: All tabs displayed in the UI (e.g. Tab 1: Inputs, Tab 2: Executive Readout, Tab 3: System of Record Provenance) must be fully functional interactive DOM surfaces. Never render static, decorative, unclickable tab labels.
   - **Print / PDF Target Alignment**: Exporting to PDF or printing must programmatically target the executive deliverable view (Tab 2 Executive Readout) rather than dumping raw interactive form inputs.


9. **Zero Third-Party Consulting Brand Hallucinations (`Rule 25I`)**:
   - **Strict Ban on Third-Party Consulting Labels**: Never inject synthetic consulting firm names or co-branding slogans (such as `McKinsey & Google`, `McKinsey`, `Stratagem/Google`) into executive readouts, navigation tabs, section subheadings, or export templates.
   - **First-Party Google Cloud / Executive Neutral Terminology**: Use pure, authoritative first-party Google Cloud / Gemini Enterprise nomenclature or neutral executive descriptors (e.g., `2. Executive Readout`, `CFO Value Realization Readout`).

10. **Zero Thread-Blocking Browser Dialogs & Mandatory Inline Input Mode (`Rule 25J`)**:
    - **Strict Ban on `window.prompt()` & `window.alert()`**: Never invoke synchronous, thread-blocking browser dialogs (`window.prompt()`, `window.alert()`, `window.confirm()`) for user inputs or status notifications.
    - **Mandatory Inline Input Mode or Docked Drawer**: Dynamic inputs (such as custom Salesforce IDs, CRM lookups, or override notes) must provide an in-situ inline editing mode (`#ge-custom-sfdc-inline-input`) with dedicated action buttons (`Scan` and `Cancel`) or open a docked slide-over drawer (Rule 25F). Floating status alerts must use non-blocking toast notifications positioned away from critical action headers (e.g., bottom-right).

11. **Real-Time Live Search, Dynamic Multi-Filter & Resilient Empty State (`Rule 25K`)**:
    - **Functional Search & Filter Binding**: Search boxes (`#search-input`) and filter selectors (`#filter-module`, `#filter-status`, `#filter-tier`) must immediately filter cards and rows in real time upon user input.
    - **Resilient Empty State Notification**: When filters yield zero matching items, display a helpful empty state (`#no-matching-cards`) with a single-click `↺ Reset All Filters` button that restores the full dataset without requiring a page reload.

12. **Verified Cross-Customer Data Grounding & Isolation (`Rule 25L`)**:
    - **Zero Cross-Customer Data Bleed**: Switching customer selectors (e.g., Enterprise A, Pfizer, Elevance, Mars, H-E-B) must strictly load isolated, verified CRM and telemetry records for the selected customer, eliminating cross-account leakage.
    - **Zero Silent Fallback to Synthetic Numbers**: Every customer entry must be backed by authentic contract seats, active users, WAU, and 18-character Salesforce account IDs. Never fall back silently to default customer data under the guise of an active selection.

13. **Rigid Table Cell Containment, Inline Truncate Safety & Zero Text-Overlap Invariant (`Rule 26`)**:
    - **Strict Ban on Naked Inline `span.truncate` (`Rule 26A`)**: Never apply Tailwind's `truncate` (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`) to naked inline elements (`display: inline`). Under W3C CSS specifications, `overflow: hidden` and `text-overflow: ellipsis` are ignored on inline elements while `white-space: nowrap` remains active, forcing unbreakable horizontal lines that never clip. All truncated elements must be block containers (`inline-block` or `block`) with bounded maximum widths (`max-w-full` or explicit width).
    - **Mandatory Flexbox Floor Reset via `min-w-0` (`Rule 26B`)**: CSS Flexbox specification dictates that flex children default to `min-width: auto`. Any flex container or child hosting truncated text must declare `min-w-0` (`min-width: 0px`) to break the intrinsic text content floor and permit container shrinkage.
    - **Mandatory Global Table Cell Containment (`Rule 26C`)**: All fixed-grid and operational data tables (`table.table-fixed tbody td`, `.gp-blue-grid-table tbody td`) must enforce `overflow: hidden; max-width: 0;` in `src/index.css` so cell content can never paint beyond cell boundaries or superimpose onto neighboring columns.
    - **Multi-Line Wrapping for Dense Operational Status (`Rule 26D`)**: When column width is narrow (<25% or <250px) but row height is available, operational gate requirements, blockers, and configuration status must use `leading-tight break-words` instead of single-line truncation.
    - **Mandatory CI Fail-Closed Quality Gate (`Rule 26E`)**: The test suite (`scripts/stop_forensic_gate.mjs`) must verify that global CSS containment rules are present and fail if cell clipping or span normalization is missing.

14. **Documentation & Architecture Center Reader IA, Single Diagram Per Guide, Blueprint-True Component Tables & Zero Diagnose-and-Ask-Permission Stalling (`Rule 25M` / `Rule 53` / `Rule 28A`)**:
    - **Single Authoritative Diagram & Single Toolbar**: Technical documentation readers (`/blogs/[docId]`) must render strictly **1** authoritative architecture diagram (`Figure 1`) per guide (`0` duplicate secondary `Figure 2`) with a single unified header toolbar (`👁️ Cloud Viewer`, `[ S | Open with Google Slides ↗ | ▼ ]`, and `✏️ Edit in Draw.io`). Never stack duplicate top breadcrumb/action cards, `doc-reader-quick-assets-bar` strips, or `catalog-reading-order-strip` pill rows.
    - **Blueprint-True Component Names (`0` Slot-Mismatch Parentheticals)**: Component tables, numbered `Agentic flow` steps, and `Products used` bullets must dynamically match the actual titles of the cards rendered in the blueprint's `#78` diagram (never hardcode `"Google Cloud Armor (Tier 1: Pooled)"` or `"Identity-Aware Proxy (IAP) (Tier 2: Bridge)"` or leak internal BigQuery table/KMS key parentheticals into service names).
    - **Zero Cross-Project Screenshot Contamination**: Multi-tenant Cloud Architecture Center guides must contain exclusively multi-tenant Google Cloud Console & Gemini Enterprise screenshots (`21` verified captures in `public/blogs-verification-screenshots/`, `0` cross-project Merck screenshots).
    - **Immediate Same-Turn Remediation (`Rule 28A`)**: Whenever the user asks *"what is useless, redundant, or half-baked?"* or points out a visual/content flaw, execute all code, test, and governance fixes in the **exact same turn** without stopping to ask permission.
