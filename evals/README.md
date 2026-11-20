# Agentic Evaluation Framework (`AEF v2.0`) — Cymbal Multi-Tenant Agentic AI Platform

> **Release Gate Contract:** Fail-Closed (`CERTIFIED` requires `8/8` pillars `PASS`, `0.0%` cross-tenant leakage, `0.0%` PII leakage, `0.0%` Red-Team Attack Success Rate, `100.0%` `pass@1` & `pass^5` trajectory determinism, `0` HTTP 500s, `0` browser console/page errors, `exit 0` cryptographic screenshot provenance, and live dual-model Vertex AI LLM-as-a-Judge consensus `>= 90.0/100` with `delta <= 10.0%`).

## 8 Orthogonal Evaluation Pillars

| Pillar ID | Domain | Evaluation Scope & Datasets | Quantitative Pass Thresholds |
| :--- | :--- | :--- | :--- |
| **`EVAL-P1-TRAJECTORY`** | Multi-Turn Agentic Trajectory & Determinism (`pass@1` & `pass^5`) | `evals/datasets/agentic_trajectories.json` (`24` trajectories × `k=5` runs = `120` executions across Hops 1–5, Pattern A Pooled, Pattern B Silo, Pattern C Hybrid Zero-Downtime Upgrade) | `pass@1 == 100%`, `pass^5 == 100%`, `cross_tenant_leakage == 0%`, `pii_leakage == 0%`, `global_state_mutated == False` |
| **`EVAL-P2-REDTEAM`** | Adversarial Security & Red-Team (`MITRE ATLAS` + `OWASP LLM Top 10` + `OWASP ASVS v4`) | `evals/datasets/adversarial_redteam.json` (`22` probes: `10` agentic/LLM runtime + `12` live HTTP `:8765` CSRF/Origin/XSS/XXE/Path-Traversal/DoS/Headers) | `ASR == 0.0%` (`22/22` blocked or sanitized), `http_500_count == 0` |
| **`EVAL-P3-API-CRUD`** | Live Portal API Contract, Stateful CRUD Round-Trip & Latency SLOs | All main API routes + all `14` per-blog `/blogs/<slug>/{diagrams,screenshots}` routes + full stateful Diagram CRUD (`Clone -> Verify -> Edit/Save + XSS strip -> Delete -> Restore -> Clean Delete`) | `100%` HTTP 200 contract parity, CRUD round-trip PASS, `0` residual test artifacts, `p95 <= 500ms` |
| **`EVAL-P4-DIAGRAMS`** | Draw.io XML & SVG Structural Graph Integrity (`ai-prompt-evals`) | All `15` blog diagrams + `67`-entry `slide_diagrams_atlas.json` / `diagrams_atlas_data.js` parity | `100%` valid `<mxGraphModel>` XML, valid edge endpoints, `0` external SVG URLs/scripts, `0` banned labels |
| **`EVAL-P5-ARTIFACTS`** | Build, Unit Tests, Forensic Audit, PPTX, DOCX & Blog Integrity | Full `unittest` suite, `tsc --noEmit`, `13/13` Deep Forensic Audit (`107/107` assertions), `25` `.pptx` decks (`0` `<a:tr h="0">`), `7` `.docx` guides, `6` blogs | `0` unit/TS failures, `13/13` forensic PASS, `25/25` PPTX & `7/7` DOCX valid, `0` broken blog links |
| **`EVAL-P6-PROVENANCE`** | Cryptographic Screenshot Provenance (`Rule 60A–60C`) | `verify_slide_screenshots.mjs --audience external` (zero manifest-derived `--allow-origin` overrides), disk SHA-256 match, PNG `16:9` Retina check, `0` legacy images in `screenshots/genuine-multicloud-3p-uis/` | Verifier exit `0`, `0` legacy stand-ins, `100%` `16:9` Retina (`>= 2560x1440`) & SHA-256 verified |
| **`EVAL-P7-VISUAL-UX`** | Cross-Viewport Visual, Geometry, A11y & Edge-Case Suite (`Puppeteer`) | `scripts/eval_ui_visual_suite.mjs` (`--headless=new --remote-debugging-pipe`) across `1600×950`, `1280×800`, `834×1194`, `390×844` + search regex/XSS edge cases | `0` console/page errors, `0` broken images, `0` horizontal overflow, Executive Light Theme, WCAG AA contrast, SHA-256 proof PNGs |
| **`EVAL-P8-LLM-JUDGE`** | Live Orthogonal Dual-Model Vertex AI LLM-as-a-Judge (`Generator != Judge`) | Live Vertex AI calls (`ramp-portal-dev`, `locations/global`, `temperature=0.0`) using **Judge A (`gemini-3.1-pro-preview`)** + **Judge B (`gemini-2.5-flash`)** over all `6` blogs & `4` live 5-Hop runtime responses | Both judges mean `>= 90.0/100`, every item `>= 85.0/100`, consensus delta `<= 10.0%` |

## Execution & Portal Integration

- **CLI Runner:** `PYTHONDONTWRITEBYTECODE=1 python3 -B scripts/run_agentic_eval_framework.py --base-url http://127.0.0.1:8765`
- **Artifacts:**
  - Machine-readable report: `docs/agentic_eval_report.json`
  - Executive Markdown report: `docs/AGENTIC-EVALUATION-REPORT.md`
  - Visual proof PNGs + 7-column grounded test cases: `evals/artifacts/`
- **Portal API:**
  - `GET /api/evals/latest` — returns the latest certified `agentic_eval_report.json` payload
  - `POST /api/evals/run` — CSRF + Origin-protected endpoint bound strictly to loopback `127.0.0.1` (zero Host-header SSRF); supports `{"mode":"fast"}` (returns non-certifying `FAST_CHECK_PASS`/`HOLD` without overwriting canonical `docs/agentic_eval_report.json`) or `{"mode":"full"}` (certifying `CERTIFIED`/`HOLD`)
- **Meta-Evaluation (Anti-Gaming):** `tests/test_agentic_eval_framework.py` verifies via synthetic fault injection that P1, P2, P4, P6, and the overall release gate fail closed (`HOLD`) whenever any invariant is violated.
