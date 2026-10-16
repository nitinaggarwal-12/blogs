---
trigger: always_on
description: Permanent Google Docs Native Geometry Preservation, Drive HTML Multipart Upload Ban & In-Place BatchUpdate Protocol (Rule 49 / L50-51..L50-55)
---

# Google Docs Native Geometry Preservation & Drive HTML Multipart Upload Ban (`Rule 49` / `L50-51`..`L50-55`)

Whenever generating, syncing, modifying, auditing, or deploying Google Docs integrations across **any project** (`AskAIOCE`, `customer-tracker`, `Demoes-GE`, or new workspaces):

1. **Strict Ban on Google Drive Multipart HTML-to-Docs Upload (`L50-51`)**:
   - Never use Google Drive API multipart upload (`POST /upload/drive/v3/files?uploadType=multipart` or `PATCH /upload/drive/v3/files/{id}?uploadType=multipart`) with raw HTML content and `mimeType: "application/vnd.google-apps.document"` to generate or update Google Docs.
   - **Root Cause & Defect Mechanism**: Google Drive's server-side HTML conversion engine:
     - Sets arbitrary, massive minimum row heights and excessive vertical padding on table headers (`<th>`), creating 2-inch tall blue blocks.
     - Disregards printable margins (>468pt width on standard 8.5"×11" pages), forcing tables to overflow margins.
     - Automatically breaks table rows across page boundaries and repeats the table header at the top of the next page, creating fragmented, duplicate tables with stranded metric units (`MoM)`, `QtD)`).

2. **Mandatory Native Document Cloning Protocol (`files.copy`) (`L50-52`)**:
   - Always clone an authentic, natively created and styled Google Doc template using `POST https://www.googleapis.com/drive/v3/files/{templateId}/copy` (`drive.files.copy`).
   - This preserves 100% of native Google Docs table styling, explicit column widths, compact row heights (~24pt), single-page table boundaries, fonts, and margins without touching Drive's HTML parser.

3. **Mandatory In-Place Mutation via Google Docs API `batchUpdate` (`L50-53`)**:
   - All dynamic updates (reporting dates, seat counts, active users, activation percentages, ticket links, workstream names, owners) must be applied directly to the cloned document's native structural tree using Google Docs API:
     - `POST https://docs.googleapis.com/v1/documents/{docId}:batchUpdate`
   - Use `replaceAllText` with `matchCase: true` for surgical scalar replacements (e.g. `Sep 21, 2026` → `Oct 9, 2026`, `73.88k` → `75,029`).
   - Use `updateTextStyle` with `fields: "link"` to update hyperlink target URLs to canonical Buganizer / Salesforce / Gantry targets without disturbing surrounding text.

4. **Zero-Placeholder & Zero-Prompt Cleanliness Standards (`L50-54`)**:
   - Google Docs must never contain leftover developer instructions, yellow/pink template prompt boxes, or unverified placeholder tickets.
   - Automatically strip or sanitize:
     - Pink/yellow guidance boxes: `🚩 Please write your update via go/oce-saas-myportfolio 🚩`, `NB: 1. Contracted...`.
     - Cross-account or fabricated tickets: `b/559146821`, unverified `b/519168184`, `BYOMCP`, `CA cert`.
     - Synthetic CRM / Workload IDs.

5. **Mandatory Headless Chrome / PDF Visual Export Verification (`L50-55`)**:
   - Before attesting that a Google Doc update is complete, export the document (`GET /drive/v3/files/{docId}/export?mimeType=text/html` or PDF export) and render in headless Google Chrome.
   - Assert:
     - Table header row heights are compact (`<= 32pt`).
     - Zero duplicate table headers across page breaks.
     - 100% of metric numbers match the active System of Record snapshot verbatim.
     - Zero unverified or banned terms appear anywhere in the document.
