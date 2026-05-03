# Phase 8: Screenshot Ingestion - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

CFB coaches photograph an in-game screen, submit it to the app, Claude Vision API parses it and pre-populates the matching form, and the user reviews and saves. Four screen types in scope: schedule/game results, player stats, recruiting class, depth chart. This phase is CFB-only (console game, no save file path). Madden ingestion is Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Screenshot Submission
- File picker only — standard OS file dialog via Tauri's dialog plugin. No drag-and-drop, no clipboard paste.
- Entry point: a "Parse Screenshot" amber button on the Dashboard Actions section (same pattern as Trophy Room / Coaching Resume buttons from Phase 7).
- After file selection, show a preview of the selected image in the app before it's sent to the Vision API. User confirms they picked the right file.
- Inherit active dynasty automatically — no dynasty picker step. Same pattern as all other data entry.

### Screen Type Selection
- User explicitly selects the screen type FIRST (dropdown or tab: Schedule / Player Stats / Recruiting / Depth Chart), then uploads the screenshot. No auto-detection.
- All 4 screen types ship in Phase 8 — schedule/game results, player stats, recruiting class, depth chart.
- Vision API prompt includes active dynasty's team name and current season year as context to help Claude distinguish teams and match player names.
- No caching — each upload triggers a fresh API call. No need to revisit previous parses.

### Confirmation and Correction UX
- Pre-filled form with the screenshot displayed above it. Standard form fields appear pre-filled; user edits inline and clicks Save.
- AI-parsed fields are highlighted with an amber tint — consistent with the amber = AI visual language (Legacy Cards, Recruiting Grades, Season Recap). Makes it obvious which values came from Vision.
- After save → return to Dashboard. No post-save toast or special landing.
- Explicit "Discard" button that returns to Dashboard without saving anything. Essential escape hatch.

### Parsing Failures and Error States
- Fields Vision couldn't read are left blank — no "?" indicator needed. Amber-tinted blank field signals "AI tried but got nothing."
- If all fields parse as blank/empty, just show the form — user self-diagnoses and can Discard and re-upload.
- API call failures (network error, invalid API key, rate limit): show error message with a Retry button. Reuses the getApiKey() / setApiKey() in-app prompt pattern already used by Legacy Cards and Season Recap.
- Loading state during the API call: spinner with "Parsing screenshot..." text. Calls take 3-8 seconds; silence feels broken.

### Claude's Discretion
- Exact layout of the ScreenshotPage (form width, image sizing, responsive behavior)
- Vision API prompt engineering for each screen type
- Form field mapping specifics (which parsed values map to which form fields per screen type)
- API key check flow (whether to prompt inline or reuse the exact existing getApiKey() modal)

</decisions>

<specifics>
## Specific Ideas

- The "Parse Screenshot" button should be amber (bg-amber-600), consistent with all AI/narrative feature buttons.
- The page structure follows the same header + back-button + max-w-4xl container pattern used by TrophyRoomPage, CoachingResumePage, etc.
- Amber highlight on AI-filled fields should be subtle (e.g. bg-amber-900/20 border-amber-600/50) — enough to signal AI origin without overwhelming the form.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-screenshot-ingestion*
*Context gathered: 2026-02-24*
