---
trigger: model_decision
description: Use when modifying Open with Google Slides / Google Docs or DiagramInlineSlidesPreviewer.tsx across PromptCanvas and blogs (Rule 47 server-side refresh_token bridge).
---

# Server-Side Refresh-Token Google Workspace Bridge & Universal 1:1 Inline Slides Previewer Rule (`Rule 47`)

Whenever implementing, modifying, or debugging `"Open with Google Slides"`, `"Open with Google Docs"`, or Inline Slide Deck Previewers across **PromptCanvas** (`/Users/nitinagga/Documents/PromptCanvas`), **Technical Blogs Studio** (`/Users/nitinagga/Documents/blogs`), or any companion enterprise studio:

## 1. Why `blogs` (`localhost:8095`) Worked 100% vs. Why Legacy Client-Side OAuth Popups Failed

1. **Never Rely on Browser GIS Popups (`google.accounts.oauth2.initTokenClient`) with Desktop OAuth Credentials**:
   - The Google OAuth credential in `.gsheet_oauth_token.json` (`nitinagga@google.com`) is an **Installed-App / Desktop refresh-token client**, not a browser Web GIS client with Authorized JavaScript Origins registered.
   - Calling `google.accounts.oauth2.initTokenClient` in the browser fails with `origin_mismatch`, `popup_closed`, or `"🔑 One-time setup: Google OAuth Client ID"` when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset.
2. **Always Use the Server-Side `refresh_token` Exchange + Drive v3 `.pptx` Multipart Conversion Bridge (and `Rule 49` `files.copy` + `batchUpdate` for Google Docs)**:
   - Exchange `grant_type=refresh_token` **server-side** at `https://oauth2.googleapis.com/token` (`getServerDriveAccessToken()` in `src/lib/server/googleWorkspaceBridge.ts` / `get_drive_access_token()` in `blogs/scripts/sync_google_workspace_bridge.py`).
   - Upload `.pptx` bytes server-side to `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true` with:
     - `mimeType: "application/vnd.google-apps.presentation"` (for Google Slides; complex Google Docs must strictly obey `Rule 49` via `drive.files.copy` + `documents.batchUpdate` and never use raw HTML `uploadType=multipart`)
     - Header `"x-goog-user-project": "nitina-ggarwal-sandbox-647724"`
   - Append `?authuser=nitinagga%40google.com` to every generated `https://docs.google.com/presentation/d/<id>/edit` and `https://docs.google.com/document/d/<id>/edit` URL.

## 2. Pre-Warmed Google Drive Manifest (`0ms` Direct Open) & Disk-Manifest-Over-Memory Priority

1. **Manifest Persistence (`src/data/cloud_viewer_manifest.json` & `blogs/slides/cloud_viewer_manifest.json`)**:
   - Pre-warmed Google Slides (`googleSlidesId`, `googleSlidesEditUrl`, `googleSlidesEmbedUrl`) and Google Docs (`googleDocsId`, `googleDocsEditUrl`, `googleDocsEmbedUrl`) entries must be stored in `cloud_viewer_manifest.json` and served via `GET /api/google-workspace/manifest`.
   - `loadCloudViewerManifest()` in `src/lib/server/googleWorkspaceBridge.ts` must always spread disk manifest files **over** `globalThis.__pcCloudViewerManifestCache` (`Object.assign(merged, parsed.entries)` after seeding from memory), and `normalizeManifestKey()` must map `ws1-*..ws5-*` to `DOC-MT-01..DOC-MT-06` (never to legacy 34-slide `WS1..WS5` keys).
   - `uploadPptxBufferToGoogleSlides()` must accept an optional `preferredId` and execute an in-place `PATCH /upload/drive/v3/files/{preferredId}?uploadType=multipart&supportsAllDrives=true` when updating existing presentations so existing bookmarks and cached links are updated in place.
   - Clicking `[ S | Open with Google Slides | ▼ ]` must prioritize `manifestKey || diagramKey` (`0ms` direct open to the pre-warmed 6-slide presentation), and fall back to `POST /api/google-workspace/open` server-side conversion for dynamic/custom diagrams.

## 3. Header-Only Action Controls, 6-Slide Interactive Cloud Viewer & 100% Full-Width Diagram Canvas (`DiagramInlineSlidesPreviewer.tsx`)

1. **Zero On-Page Slide Deck Previewer Box**:
   - Never render a 2-pane `1. EDITABLE SLIDE DECK PREVIEWER (.PPTX & GOOGLE SLIDES)` box or duplicate inner summary card on the page UI (`/dashboard`, `/blogs`, `/library`).
   - Instead, render **ONLY the header options** (`👁️ Cloud Viewer` + `[ S | Open with Google Slides ↗ | ▼ ]` split-dropdown menu via `headerOnly={true}` on `/dashboard` `AppHeader`, `/library` preview modal header, and `/blogs` `Figure 1` toolbar), while displaying the architecture diagram itself cleanly at **100% full width**.
2. **Same-Screen Cloud Viewer Modal (`👁️ Cloud Viewer` — 6-Slide 1:1 Parity)**:
   - Clicking `👁️ Cloud Viewer` in the header opens the 3-mode Same-Screen Cloud Viewer Modal (`✨ Interactive Slides Studio` rendering all 6 slides `1:1` with the Google Slides deck, `🌐 Live Google Slides Embed`, `📄 Live Google Docs Spec`) without cluttering the main canvas UI.

## 4. Calibrated Google Cloud Architecture Center (`#78`) Editable Slides, 1:1 White DevSite `<article>` Sheets (`addDevSiteArticleSheet`) & Zero-Overlap Geometry (`editablePptxCompiler.ts`)

1. **Uniform Aspect-Preserving Scaling, 52px Intra-Spoke Channel & Single-Column White DevSite `<article>` Sheets (`addDevSiteArticleSheet`)**:
   - Never stretch `1200x1410` vertical `#78` diagrams across `13.33"x7.5"` widescreen slides with non-uniform `scaleX !== scaleY`.
   - Enforce `uniformScale = Math.min(availW / effGraphW, availH / effGraphH)`, non-title bounding box (`visibleNonTitleVertices`), skip `hdr_title_box` inside the diagram canvas (`isArchCenter78`), widen the intra-spoke central connector channel in Zone 3 (`#feefc3`) and Zone 4 (`#fad2cf`) to `52px` (`x=290..342` left spoke, `x=834..886` right spoke) with staggered elbow X coordinates (`312` vs `320` left, `856` vs `864` right), `0.85pt` `#DADCE0` card strokes, `1.0pt` `#5F6368` connector lines, and `isTinyElbowStub` (`<0.14"`) arrowhead suppression, and render the 6-slide single-column white DevSite `<article>` presentation via `addDevSiteArticleSheet` (`0` 4-color top ribbons, `0` green pill badges, `0` 4-zone bento sidebars, and role/team labels only under `Contributors`).
2. **Bounded Container Headers, Aspect-Preserved Icons & Compact OpenXML Arrowheads**:
   - Cap top/spoke container headers (`isTopFullWidthContainer` `Math.min(bw * 0.44, 2.45)` & `isSpokeOuterWrapper` `Math.min(bw * 0.65, 1.92)` at `3.85pt`), preserve service icon and `Google Cloud` wordmark aspect ratios (`addImagePreservingAspect`), preserve multi-line card breaks (`normalizeDrawioHtmlForSlides`), use `5.0–5.8pt` `fit: 'shrink'` card typography, and post-process OpenXML arrowheads to `<a:tailEnd type="triangle" w="sm" len="sm"/>` (`postProcessPptxCompactArrowsBase64`).
3. **Cohesive 6-Slide Space Allocation, Zero Ellipses (`0` `…`/`...`), Zero Auto-Collapsing `addTable()` & Single-Source Manifest Purity (`FALLBACK_MANIFEST`)**:
   - Never use PptxGenJS `slide.addTable()` (`<a:tbl>`) on Slides 2, 3, or 5 (which Google Slides collapses to minimum row height, leaving 2-inch blank voids below the table). Always render explicit-height structured card rows (`roundRect` + accent bar + `valign: 'middle'` text runs) weighted by item count.
   - Strip noisy injected diagram-node parenthetical echoes via `deduplicateParentheticalEchoes()`, respect semicolon (`;`) and period (`.`) clause boundaries via `truncateClean()` (`0` `…` or `...` truncations across all 6 slides).
   - `FALLBACK_MANIFEST` in `DiagramInlineSlidesPreviewer.tsx` must source `WS1`..`WS5`, `BP-78`, and `DOC-MT-01`..`DOC-REF-09` exclusively from `src/data/cloud_viewer_manifest.json` (`0` stale hardcoded `WS1`..`WS5` IDs overriding `cloudViewerManifestData`), and `scripts/verify_export_slides_quality_gate.ts` (`verifySixSlideBlogEditableDecks`) must inspect the compiled `.pptx` ZIP XML (`ppt/slides/slide1.xml`..`slide6.xml`) to verify `w="sm" len="sm"`, `0` `<a:tbl>`, `0` `…`/`...` ellipses, `0` `4-ZONE HUB-AND-SPOKE TOPOLOGY KEY` bento sidebars, and complete 6-slide DevSite `<article>` content across all 9 canonical guides.
