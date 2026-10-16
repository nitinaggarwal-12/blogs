# Google Slides & Presentation Brand & Native Visual Architecture Rules

When designing, updating, or generating any presentation or slide deck (or creating any new demo), the agent MUST enforce these non-negotiable brand, visual diagram, and grounding constraints:

1. **Color Order & Enterprise Architecture Palette Rule**:
   - Any sequential use of Google brand colors MUST be strictly:
     1. Blue (`#4285F4`)
     2. Red (`#EA4335`)
     3. Yellow (`#FBBC04`)
     4. Green (`#34A853`)
   - For enterprise architecture diagrams, roadmap phases, sequence lifelines, and operating model pillars, combine the Google Quad-Color sequence with the Executive Architecture Palette:
     - Deep Navy (`#0F2942` / `#0B2545`) for Zone 1 / Phase 1 / Sovereign VPC containers
     - Deep Teal (`#0D7A75` / `#137369` / `#1B5E7B`) for Zone 2 / Phase 2 / Gateway Normalization Engines
     - Slate Blue (`#54728C`) for Zone 3 / Phase 3 / Co-Design & Governance containers
     - Semantic Alert Red (`#D93025`) for Incoming Unmitigated / Broken Payloads and Semantic Success Green (`#1E8E3E`) for Clean Compliant Payloads

2. **Typography**:
   - Slide Titles & Display Numbers: `Google Sans` / `Google Sans Display` (Dark Gray `#3C4043`, or `#0F2942` on architecture headers).
   - Body Copy & Captions: `Roboto` or `Google Sans Text` (Medium Gray `#5F6368`).
   - Code & Wire Payloads: `Roboto Mono` or `Courier New` (`9pt–10pt`) inside structured JSON/protocol cards with highlighted token pills.

3. **Containers**:
   - All content cards must use light gray (`#F8F9FA`) or pure white (`#FFFFFF`) with subtle borders (`#DADCE0` or `#0D7A75` / `#0F2942` zone outlines) and `8px` border-radius (`ROUND_RECTANGLE`). Never use arbitrary saturated neon gradient cards or purple drop-shadows.

4. **Mandatory 6 Editable Architectural Visual Archetypes + Grounded Live Screenshots**:
   - **Never generate text-only decks or uneditable flat raster-only slide decks.**
   - Every technical demo and slide deck MUST weave together:
     1. **100% Native Editable Vector Diagrams** constructed from native Google Slides shapes (`ROUND_RECTANGLE`, `RECTANGLE`, `ELLIPSE`, `RIGHT_ARROW`, lines/connectors, and editable text boxes) using the 6 canonical visual archetypes:
        - `architecture-zone-topology`: 3-Zone End-to-End Architecture (`Client/AI Zone` -> `Cloud Run / Gateway Engine Zone` -> `Enterprise Internal VPC Zone` in `#0B2545` dark navy with nested white component cards and directional arrows).
        - `payload-transformation-triptych`: 3-Stage Wire Payload Transformation (`Incoming Contaminated/Error Request` [`#D93025` border] -> `Normalization / Policy Engine` [`#1B5E7B` teal container with 3 inner stage pills] -> `Clean Compliant Payload` [`#1E8E3E` border]).
        - `uml-sequence-swimlane`: 5-Actor UML Lifeline & Numbered Sequence Diagram (`1..6`) with top actor headers, vertical dashed/solid lifelines, colored activation bars, horizontal request/response arrows, and dormant/review window bands.
        - `phased-roadmap-timeline`: 3-Phase Connected Horizon Roadmap (`Phase 1` Navy `#0F2942`, `Phase 2` Teal `#0D7A75`, `Phase 3` Slate `#54728C`) with top header bands, dual circular inter-card connectors (`● ●`), timeframe subtitles, and bottom outcome summaries.
        - `async-state-flow-pipeline`: 4-Node Horizontal State Machine & Feedback Loop (`Node 1` Navy -> `Node 2` Amber `#CA8A04` -> `Node 3` Teal `#137369` -> `Node 4` Dark Teal `#0F766E`) with numbered callouts (`1..5`) and a bottom return feedback loop arrow.
        - `strategic-operating-model-pillars`: 3-Pillar Executive Operating Model Cards with top & bottom colored accent bars (`#0F2942`, `#0D7A75`, `#54728C`), top icon badges, centered bold headers, and 3 grounded bullet points per pillar.
     2. **Grounded Live Console & Product Screenshots (`live-screenshot-callout`)**:
        - Embed real, verified Google Cloud Console, Gemini Enterprise, and AWS screenshots (`createImage` / `addImage`) side-by-side with native editable Google Slides callout cards, numbered badges, and metrics so both the visual proof and surrounding annotations remain 100% editable, relevant, complete, grounded, and accurate.

5. **Confidentiality & Aspect Ratio**:
   - Every single slide footer must contain: `"Proprietary + Confidential"`.
   - Aspect Ratio: Widescreen `16:9` (`720pt × 405pt`).
