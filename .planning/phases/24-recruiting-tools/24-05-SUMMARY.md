---
phase: 24-recruiting-tools
plan: "05"
subsystem: recruiting-ui
tags: [recruiting, export, html2canvas, signing-day, tool-05, png-export]

dependency_graph:
  requires:
    - 24-02 (RecruitingPage post-wiring — recruitsForClass, activeClass, CFB guard already in place)
  provides:
    - Signing Day Class Card hidden render target (off-screen 640x360)
    - Export Class Card button (alongside Generate Signing Day Grade)
    - handleExportCard: html2canvas capture + Tauri save dialog + writeFile chain
    - TOOL-05 in REQUIREMENTS.md §Recruiting Tools + traceability table
  affects:
    - apps/desktop/src/pages/RecruitingPage.tsx (export button + hidden card + handler + data calcs)
    - apps/desktop/package.json (html2canvas@1.4.1 added)
    - .planning/REQUIREMENTS.md (TOOL-05 entry + count 40→41)

tech_stack:
  added:
    - html2canvas@1.4.1 (in apps/desktop only, not workspace root)
  patterns:
    - html2canvas capture → base64 → Uint8Array → Tauri save() → writeFile() (mirrors LegacyCardExport pattern)
    - Off-screen render target: fixed -left-[9999px] top-0 (NOT display:none — html2canvas requires DOM visibility)
    - useToastStore.getState().success/error pattern for non-reactive toast calls inside async handler

key_files:
  created: []
  modified:
    - apps/desktop/package.json
    - apps/desktop/src/pages/RecruitingPage.tsx
    - .planning/REQUIREMENTS.md

decisions:
  - html2canvas@1.4.1 pinned per RESEARCH.md verified version
  - Export button placed as immediate sibling of Generate Signing Day Grade button in a flex gap-2 container; Generate Signing Day Grade button changed from w-full to flex-1 to accommodate the new sibling
  - Export button is only available when there is no aiGrade yet (same panel as the generate button); when a grade IS displayed, only the grade/analysis is shown — this is consistent with the plan spec of placing both buttons in the same flex container
  - useRef and useState added directly to the existing React import line (not a duplicate import)
  - @tauri-apps/plugin-dialog and @tauri-apps/plugin-fs were already in package.json dependencies; only import statements added to RecruitingPage.tsx
  - activeClass.year is a number in the RecruitingClass type; no cast needed — template literal handles the conversion naturally
  - cardPosBreakdown has 3 usages (definition + for-loop + render) which satisfies ≥2 criterion
  - Card render target placed just before closing </div> of page root, after AddPlayerModal

metrics:
  duration: "~3 min"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 3
---

# Phase 24 Plan 05: Signing Day Class Card Export Summary

Implemented the Signing Day Class Card export (TOOL-05) — a shareable PNG artifact for social media that captures commit count, average star rating, position breakdown, and top 3 recruits from the active recruiting class.

## What Was Built

### Task 1: Install html2canvas + REQUIREMENTS.md TOOL-05 entry

**html2canvas installed:**
- Version: `1.4.1` (pinned exact version per RESEARCH.md)
- Installed in `apps/desktop` only (not workspace root), scoping the blast radius
- Lockfile (`pnpm-lock.yaml`) updated

**REQUIREMENTS.md updated:**
- Added TOOL-05 bullet to §Recruiting Tools:
  ```
  - [ ] TOOL-05: A Signing Day Class Card can be exported as a PNG via the OS save dialog...
  ```
- Added `| TOOL-05 | Phase 24 | Pending |` row to traceability table immediately after TOOL-04
- Coverage count incremented: 40 total → 41 total; Mapped to phases: 40 → 41
- `Last updated` timestamp updated to 2026-05-05

### Task 2: Export button + hidden render target + handleExportCard handler

**File: `apps/desktop/src/pages/RecruitingPage.tsx`**

**New imports added at top of file:**
```typescript
import html2canvas from 'html2canvas';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { useToastStore } from '../store/toast-store';
```
`useRef` added to existing React import.

**State additions:**
```typescript
const cardRef = useRef<HTMLDivElement>(null);
const [exportingCard, setExportingCard] = useState(false);
```

**Card data computed inline after store destructure:**
- `cardCommitCount` = `recruitsForClass.length`
- `cardAvgStars` = sum of stars / count, `.toFixed(2)`, or `'—'` when empty
- `cardPosBreakdown` = `Record<string, number>` grouped by `r.position`
- `cardTop3` = top 3 by stars desc, then nationalRank asc (Infinity for nulls)

**handleExportCard handler:**
- Guards: `!cardRef.current || !activeClass` → early return
- Captures with `html2canvas(cardRef.current, { backgroundColor: null, scale: 2, useCORS: true })`
- Converts `canvas.toDataURL('image/png')` → base64 → `Uint8Array`
- Opens Tauri `save()` dialog with `defaultPath: signing-day-${activeClass.year}.png`
- User cancel (`filePath === null`) → silent return to idle
- On success: `writeFile(filePath, bytes)` + success toast with filename
- On error: console.error + error toast
- `finally` block: always calls `setExportingCard(false)`

**Button placement:**
The existing "Generate Signing Day Grade" button was in a `w-full` block. It is now inside a `div.flex.gap-2` container with `flex-1` applied (from `w-full`), making room for the new Export Class Card button as its immediate sibling:
```tsx
<div className="flex gap-2">
  <button onClick={handleGenerateGrade} ... className="flex-1 ...">
    Generate Signing Day Grade
  </button>
  <button type="button" onClick={handleExportCard} disabled={exportingCard || recruitsForClass.length === 0}
    className="px-4 py-2 border border-gray-600 ...">
    {exportingCard ? 'Generating…' : 'Export Class Card'}
  </button>
</div>
```

**Hidden off-screen render target (640×360):**
- Positioned with `fixed -left-[9999px] top-0 w-[640px] h-[360px]` — NOT `display:none`
- Gated: `{activeClass && (...)}` — only rendered when a class is active
- `aria-hidden="true"` — excluded from accessibility trees
- Contains: header (year + "Recruiting Class" label), hero stats row (commit count + avg stars), section divider, position breakdown, top 3 recruits, "Dynasty OS" footer watermark

**Plan 02 additions verified intact:**
- `recruit.isCommitted ? 'Committed' : 'Uncommitted'` toggle: present at line 781
- Hard Sell badge, Add to Roster button: unchanged

## Generate Signing Day Grade button — placement detail

The button was originally `w-full` in a solo container. It is now `flex-1` in a `flex gap-2` row shared with Export Class Card. This change preserves identical appearance when there's no aiGrade and makes the export action accessible in the same visual context without adding a separate toolbar section.

## REQUIREMENTS.md totals

- Before: `v2.2 requirements: 40 total`, `Mapped to phases: 40`
- After: `v2.2 requirements: 41 total`, `Mapped to phases: 41`
- Phase 24 traceability is now complete: TOOL-01 through TOOL-05 all mapped.

## Deviations from Plan

### Style deviation: Generate Signing Day Grade button changed from w-full to flex-1

- **Found during:** Task 2 button placement
- **Issue:** The plan says "place the new button as its IMMEDIATE sibling (same row, same flex container)" — the existing button was `w-full` with no flex parent; adding a sibling directly would create a block-level stacking
- **Fix:** Wrapped both buttons in a `div.flex.gap-2` container; changed `w-full` to `flex-1` on the Generate button — this preserves the full visual width feel while allowing the Export button to be a peer
- **Files modified:** `apps/desktop/src/pages/RecruitingPage.tsx`
- **Impact:** No behavioral change; both buttons are in the same row as intended

No other deviations — plan executed as specified.

## Known Stubs

None — all data paths are wired. The card render target reads from live `recruitsForClass` (Zustand store), `activeClass`, and computed card data. The export handler uses real html2canvas capture + Tauri file system writes.

## Threat Flags

Threat model from plan verified:
- T-24-05-01 (Tampering/XSS): Recruit names bound via React text nodes `{r.name}` — NOT `dangerouslySetInnerHTML`. React escapes before html2canvas rasterizes.
- T-24-05-02 (Tampering): File path supplied by OS-native `dialog.save()` chooser; `defaultPath` is a filename hint only.
- T-24-05-03 (Info Disclosure): Card is `aria-hidden="true"`; data is identical to what's shown on page.
- T-24-05-04 (DoS): 640×360@scale=2 is bounded; recruitsForClass is in-memory, typically <30 entries.
- T-24-05-05 (Repudiation): Silent cancel on dialog close by design.
- T-24-05-06 (Supply chain): html2canvas@1.4.1 pinned exact version; installed in apps/desktop only.

No new threat surface beyond the plan's threat register.

## Self-Check

**Commits:**
- `e203fda` — chore(24-05): install html2canvas 1.4.1 + add TOOL-05 to REQUIREMENTS.md
- `7a4c5ee` — feat(24-05): TOOL-05 Signing Day Class Card export on RecruitingPage

**File existence checks:**
- `apps/desktop/package.json` — modified (html2canvas@1.4.1)
- `apps/desktop/src/pages/RecruitingPage.tsx` — modified (export button + card + handler)
- `.planning/REQUIREMENTS.md` — modified (TOOL-05 entry + 40→41 count)

**TypeScript:** Only pre-existing workspace package resolution errors (present before this plan) — no new errors introduced in RecruitingPage.tsx.

## Self-Check: PASSED
