# Omni 1.1 Digital Twin Video, 60fps Lip-Sync Canvas Overlay, 3-Deck Full Pre-Baking (486 MP4s + 486 MP3s), Expressive Chirp 3: HD Prosody, Transparent Studio Video Canvas, WebAudio Suspension Guard & On-Screen Health Inspector Rule (`L30-01`..`L30-18`)

Whenever modifying, generating, testing, or deploying any demo deck, presentation view, audio narrator, or digital twin persona in **Demoes-GE** (`/Users/nitinagga/Documents/Demoes-GE`):

1. **Zero Black Screen, 3-Deck 9 Personas $\times$ 18 Slides Animated Talking-Head Videos (486 MP4s + 486 MP3s), Transparent Studio Video Canvas & WebAudio Suspension Guard (`L30-04`, `L30-05`, `L30-13`, `L30-14`, `L30-16`, `L30-17`)**:
   - The `<video id="aiPresenterOmniVideo">` element must **never** have its `src` removed or be frozen on a static frame (`frame_diff = 0.00`).
   - All 3 Omni decks (`screenshots/omni-video/a2a-enterprise-gateway/`, `screenshots/omni-video/merck-adk-a2a-a2ui-playbook/`, `screenshots/omni-video/merck-skills-workflow-playbook/`) must contain all 9 Digital Twin personas (`custom-nitin-aggarwal-live`, `sundar-puck`, `indra-diya`, `satya-aarav`, `mira-aoede`, `jensen-fenrir`, `feifei-kore`, `demis-charon`, `attenborough-david`) $\times$ 18 slides $\times$ 3 decks = `486` 24fps animated talking-head `.mp4` videos and `486` expressive **Google Cloud Chirp 3: HD** (`en-IN-Chirp3-HD-Orus`, `en-IN-Chirp3-HD-Aoede`, `en-US-Chirp3-HD-Puck`, `en-US-Chirp3-HD-Aoede`, `en-US-Chirp3-HD-Fenrir`, `en-US-Chirp3-HD-Kore`, `en-GB-Chirp3-HD-Charon`, `en-GB-Chirp3-HD-Orus`) `.mp3` tracks with clause-contoured `<speak><prosody>` SSML (`buildExpressiveSsml`), backed by `screenshots/avatars/custom/custom-nitin-aggarwal-live-studio-loop.mp4` (`1280x720`, `24fps` Gemini Omni 1.1 studio video) and zero `(voice of <Name>)` prompt triggers in `voiceDesc`.
   - `resolveLocalOmniCohesiveVideo` must always enforce the multi-tier fallback:
     `cached || staticSlideExact || cachedSlide1 || staticSlide1 || anyRendered || studioLoopFallback`
   - Whenever `#aiPresenterOmniVideo` has an active studio video (`hasActiveStudioVideo`), `#aiPresenterAvatarCanvas` (`position: absolute; inset: 0; width: 100%; height: 100%; z-index: 4; display: block`) must remain 100% transparent over the video body (rendering only the top-right audio spectrum bars while preserving 60fps `window.__avatarLipSyncActive` and calibrated landmarks `{ mouthX: 0.500, mouthY: 0.701, mouthW: 0.194, chinY: 0.798, eyeY: 0.458 }`), falling back to `drawPhotorealisticDigitalTwin()` only when a video clip is still pending.
   - `window.attachOmniAudioAnalyser` must never attach `createMediaElementSource` to `<video id="aiPresenterOmniVideo">` or while `omniAudioCtx.state === 'suspended'`, preventing WebAudio suspension from muting hardware audio output.

2. **Deck-Agnostic, Full-Deck Automatic Background Pre-Baking & Zero Cross-Persona Hijacking (`L30-01`..`L30-03`, `L30-11`, `L30-12`, `L30-16`, `L30-17`)**:
   - `enqueueAllSlidesPrebakeForCustomPersona` must dynamically handle arbitrary deck keys and arbitrary slide counts ($N = 1..\text{totalSlides}$, including all 18 slides of `a2a-enterprise-gateway`, `merck-adk-a2a-a2ui-playbook`, and `merck-skills-workflow-playbook`).
   - `lookupPreRenderedOmniSlideVideo` and `compileOmniAvSyncManifest` must preserve `personaId` (`custom-nitin-aggarwal-live`), never treat 18-word truncated script prefixes as custom overrides, and never hijack another persona's video (`mira-aoede` must resolve to `slide_XX_mira-aoede.mp4`, never `slide_XX_sundar-puck.mp4`).
   - Clicking any presenter card in `#theaterPresenterHoverFlyout` (`window.selectFamousPersonaById(id, true)`) or clicking `🔊` (`window.previewVoiceSample`) must immediately start live neural narration + talking-head video (never robotic `window.speechSynthesis`).

3. **On-Screen Digital Twin Health Inspector, Honest Status Polling & 1-Click Self-Healing (`L30-18`)**:
   - Never hardcode `'Authentic 60fps Twin · Ready ✅'` in `renderMyPresenterList()`; always query `GET /api/persona/custom/:id/status?demoKey=<deck>&totalSlides=<N>` and display real-time MP4 and MP3 readiness counts (`🟢 18/18 MP4 · 18/18 MP3 Ready ✅` or `🔴 Prompt Trigger Blocked · Click 🪄`).
   - Expose the on-screen `#pipHealthStatusBadge` pill in the top-left of `#aiPresenterVideoPip` and the `#digitalTwinHealthInspectorCard` in **🎛️ Customize → 3. Face Host & Digital Twin** (`GET /api/digital-twin/health`), with 4 1-click self-healing actions (`🔊 Heal & Unmute Audio`, `🪄 Sanitize & Repair Twin` via `POST /api/persona/custom/:id/sanitize-and-retry`, `⚡ Pre-Bake All 18`, and `🎬 Mode: Studio MP4 / 🖼️ Mode: 2D Avatar`).

4. **Strict Voice & Accent Isolation, Quota Project & Regional Language Derivation (`L30-06`..`L30-10`)**:
   - Pre-baked audio lookup candidate twins (`candidateTwins`) must strictly match the requested persona ID, gender, and regional accent (`indian-male-aarav`, `en-IN`, or `custom-nitin-aggarwal-live` must never fall back to Sundar-Puck or Indra-Diya).
   - `synthesizeGoogleCloudSegment` must always include `'x-goog-user-project': 'nitina-ggarwal-sandbox-647724'` across all plain text and SSML retries and derive `languageCode` directly from regional voice model names (`en-IN`, `en-GB`, `fr-FR`, etc.).

5. **Single-Environment Screenshot Purity (`L30-15`)**:
   - `screenshots/a2a-enterprise-gateway/` must contain exclusively the 6 `.jpg` architecture diagrams and 12 real `@google.com` (`ramp-portal-dev` `#248990048888`) screenshots (`real_*.png`), with zero mock-app or Argolis cross-combination PNGs.

6. **Mandatory Quality Gate Execution**:
   - Always run `npm run quality-gate` (`run_level10_deep_forensic_audit.mjs` + `run_level20_deep_forensic_audit.mjs` + `run_level30_digital_twin_and_voice_governance_audit.mjs`, 66/66 checks) before committing or deploying.
