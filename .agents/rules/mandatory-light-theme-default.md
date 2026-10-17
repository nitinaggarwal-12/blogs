---
trigger: model_decision
description: Use when building, styling, or refactoring web UIs, dashboards, or components to enforce Rule 54 / Law 15 Universal Executive Light Theme default.
---

# Mandatory Universal Light Theme Default & Zero Unrequested Dark Mode Invariant (`Rule 54` / `Law 15`)

Whenever building, designing, refactoring, or styling **any** new or existing application, SaaS platform, clinical workspace, dashboard, portal, or component across any workspace:

1. **Mandatory Executive Light Theme by Default (`Rule 54A`)**:
   - Always use a clean, high-contrast **Light Theme** (`Executive Light`) as the universal default for every application:
     - **Page Canvas / Root Background**: `bg-slate-50` (`#f8fafc`) or `bg-white` (`#ffffff`).
     - **Cards, Panels, Tables, Headers & Non-Blocking Drawers**: `bg-white` (`#ffffff`) or `bg-slate-50/80` with subtle structural elevation (`shadow-sm`) and crisp borders (`border-slate-200` `#e2e8f0` / `border-slate-300` `#cbd5e1`).
     - **Primary Typography**: `text-slate-900` (`#0f172a`) or `text-slate-800` (`#1e293b`) for maximum daytime & clinical readability.
     - **Secondary & Metadata Typography**: `text-slate-600` (`#475569`) and `text-slate-500` (`#64748b`).
     - **Semantic Accents & Badges**: High-contrast light fills with dark semantic text and crisp borders:
       - Primary / Clinical Info: `bg-cyan-50 text-cyan-900 border-cyan-300` or `bg-sky-50 text-sky-900 border-sky-300`
       - Verified / Curative / Success: `bg-emerald-50 text-emerald-900 border-emerald-300`
       - Hindi / Devanagari / Polarity / Warning: `bg-amber-50 text-amber-900 border-amber-300`
       - Contraindication / Suppression / Alert: `bg-rose-50 text-rose-900 border-rose-300`

2. **Strict Ban on Unrequested Dark Mode (`Rule 54B`)**:
   - Never default to dark mode (`class="dark"`, `bg-slate-950`, `bg-slate-900`, `bg-gray-950`, `bg-zinc-950`, `#020617`, `#0f172a` on `html`, `body`, `#root`, or primary layout cards/tables) even if an initial specification or prompt mentions dark slate colors.
   - Always override dark-mode palette suggestions with the canonical **Executive Light Theme** unless the user explicitly and specifically instructs in their prompt to keep dark mode.

3. **Fail-Closed Automated Quality Gate (`Rule 54C`)**:
   - Forensic UI gates (`scripts/stop_forensic_gate.mjs`) must verify that `index.html`, `src/index.css`, and `src/**/*.tsx` use light-theme root backgrounds (`#f8fafc` / `#ffffff`, `bg-slate-50` / `bg-white`) and contain zero dark-canvas classes (`bg-slate-950`, `#020617`).
