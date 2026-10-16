---
trigger: always_on
description: Always capture and display Before and After screenshots for any UI, dashboard, slide deck, PDF, or visual change.
---

# Mandatory Before & After Visual Proof Rule

Whenever a task involves creating, modifying, fixing, or styling any visual surface (web UI, dashboard, component, slide deck, PDF, or HTML/document layout):

1. **Capture "Before" State First**:
   - Before modifying the UI or visual artifact (or using the baseline route/screenshot prior to the change), capture a screenshot of the original state (`before_<feature>.png`).
   - If creating a brand-new tab or page in an existing app, capture the parent navigation/workspace before the new tab is added.
2. **Capture "After" State Post-Verification**:
   - After building and verifying the change in a real browser/renderer, capture one or more screenshots of the updated state (`after_<feature>.png`).
3. **Embed in a User-Facing Artifact**:
   - Copy all `before_*.png` and `after_*.png` files into the active conversation's `<appDataDir>/brain/<conversation-id>/` artifact directory.
   - Embed them in a user-facing artifact (using a `carousel` block or side-by-side comparison) with standard image embedding syntax: `![Descriptive caption](/absolute/path/in/artifact/dir.png)`.
   - Never use plain `[link](file://...)` syntax in place of embedded `![caption](/abs/path.png)` screenshots.
