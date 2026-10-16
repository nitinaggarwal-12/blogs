---
trigger: always_on
description: Any generated or modified diagram must be automatically saved with a semantic micro-version number (e.g., v1.0.1, v1.0.2) and immediately available under Drafts in the Architecture Library (/library).
---

# Mandatory Auto-Draft Micro-Versioning & Library Persistence Rule

Whenever any architecture diagram is generated, synthesized, decompiled, or modified via prompt across PromptCanvas (`/dashboard`, `/studio`, `/vision`, or API synthesis):

1. **Semantic Micro-Version Numbering (`v<major>.<minor>.<micro>`)**:
   - Every generated diagram or iterative prompt modification from a baseline (`v1.0`) or active version must automatically increment and stamp a **micro-version number** (e.g., `v1.0.1`, `v1.0.2`, `v1.0.3`, or `v<major>.<minor>.<micro>`).
   - Promoting a draft to an official saved project increments the minor or major version (`v1.1`, `v2.0`), while in-progress prompt generations always track granular micro-versions.

2. **Immediate Automatic Draft Persistence**:
   - Generated diagrams must **never** remain trapped exclusively in ephemeral tab `sessionStorage`.
   - Immediately upon generation, every diagram must be auto-persisted as a Draft (`created_studio: 'draft'`, `status: 'draft'`) to persistent client storage (`localStorage` under `promptcanvas_draft_blueprints` and `promptcanvas_saved_blueprints`) and the backend database (`/api/diagrams`).

3. **First-Class "Drafts" Tab in Architecture Library (`/library`)**:
   - The Saved Architectures & Enterprise Library (`/library`) must expose a dedicated **`📝 Drafts`** tab (`?studio=drafts`) and KPI counter.
   - All auto-saved micro-versioned diagrams—including Zero-Blueprint Custom AST syntheses (such as the NASA Closed-Loop Mission Control & Parallel Multi-Universe Digital-Twin Agentic Harness `v1.0.1`)—must be immediately searchable and accessible under **Library → Drafts** and reopenable in the Dashboard with full version lineage and provenance dossiers intact.
