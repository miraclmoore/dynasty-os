---
phase: 21-data-model
verified: 2026-05-04T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Key moment round-trip: log a key moment in Rivalry Tracker, export the dynasty, import on a fresh DB, verify the moment appears in Rivalry Tracker after import"
    expected: "The moment with correct year and description appears under the correct rival after import, attached to the newly-remapped rivalId"
    why_human: "Requires a running Tauri app, actual IndexedDB state, and file system export — cannot verify the IndexedDB → export JSON → fresh import → display chain without launching the app"
  - test: "SeasonEndModal sport-gating: open SeasonEndModal in a CFB dynasty and a Madden dynasty"
    expected: "CFB: Bowl / Playoff Opponent input is visible. Madden: Bowl / Playoff Opponent input is NOT rendered. Key Events textarea appears in both."
    why_human: "Conditional render based on sport prop only verifiable visually at runtime"
  - test: "Colored dev trait badge: add a player with devTrait='superstar' and view on Roster + Player Profile"
    expected: "Roster row shows purple badge labeled 'Superstar' below player name. Player Profile bio shows same colored badge. Tooltip on badge reads 'Superstar Development Trait'."
    why_human: "Tailwind class rendering and Tooltip hover behavior require a running browser"
  - test: "CFB DB/RS badges on roster: edit a CFB player to set a deal breaker category and isRedshirt=true"
    expected: "Roster row shows orange 'DB' badge with tooltip 'Deal Breaker: {category}' and red 'RS' badge with tooltip 'Redshirt'. Editing a Madden player shows no DB/RS badges on roster regardless of stored values."
    why_human: "Sport-gating visual behavior and tooltip text require a running browser"
  - test: "Recruit motivation pills: add a recruit with all three motivations + deal breaker motivation + visit week"
    expected: "Recruit row shows M1, M2, M3 blue pills (hover shows full category), orange DB pill (hover shows deal breaker category), and plain 'Week N' text. No pills appear for a recruit with no motivations set."
    why_human: "Pill rendering and native title= tooltip hover require a running browser"
---

# Phase 21: Data Model Verification Report

**Phase Goal:** Land the v2.2 data model — TypeScript types, Dexie schema, and UI fields for DMOD-01 through DMOD-05
**Verified:** 2026-05-04
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                                                                | Status     | Evidence                                                                                    |
|----|------------------------------------------------------------------------------------------------------------------------------------------------------|------------|---------------------------------------------------------------------------------------------|
| 1  | A rivalry key moment round-trips through dynasty export, fresh install, and import                                                                    | VERIFIED   | `db.keyMoments` populated by `rivalry-service.ts`; exported via `export-import.ts` v4 with `rivals[]` + `keyMoments[]`; rivalIdMap remaps FK references on import. Both direct-insert and remap paths wire `db.rivals` + `db.keyMoments`. |
| 2  | Ending a season saves bowlOpponent and keyEvents; ProgramTimelinePage renders without `(season as any)` casts                                         | VERIFIED   | `grep -c "(season as any)" timeline-service.ts` → 0. `SeasonEndModal` state hooks for `bowlOpponent` and `keyEvents` confirmed. `ProgramTimelinePage` renders `node.bowlOpponent` and `node.keyEvents.map(...)` from timeline-service. |
| 3  | Dev trait selectable in AddPlayerModal and EditPlayerModal; colored badge on roster and player profile                                                 | VERIFIED   | `devTrait` state + persistence in `AddPlayerModal.tsx` and `EditPlayerModal.tsx`. `DEV_TRAIT_BADGE` imported in `RosterPage.tsx` and `PlayerProfilePage.tsx`. Tooltip uses `content` prop (confirmed from Tooltip.tsx). |
| 4  | CFB deal breaker tag + RS badge in EditPlayerModal and roster row; recruit motivations display correctly on recruit card                               | VERIFIED   | `dealBreaker: sport === 'cfb' ? ... : undefined` and `isRedshirt: sport === 'cfb' ? ... : undefined` in EditPlayerModal. `activeDynasty.sport === 'cfb' &&` guards on DB/RS badges in RosterPage. M1/M2/M3/DB pills + `Week {recruit.visitWeek}` text in RecruitingPage. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core-types/src/key-moment.ts` | KeyMoment interface with 7 required fields | VERIFIED | All fields present: id, dynastyId, rivalId, year, description, createdAt, updatedAt |
| `packages/core-types/src/index.ts` | Re-exports KeyMoment via `export * from './key-moment'` | VERIFIED | Line 20 confirmed |
| `packages/core-types/src/player.ts` | Player.devTrait + dealBreaker + isRedshirt | VERIFIED | All three optional fields present at lines 22-25 |
| `packages/core-types/src/season.ts` | Season.bowlOpponent + keyEvents | VERIFIED | Lines 16-17 |
| `packages/core-types/src/recruiting.ts` | Recruit.motivation1/2/3 + dealBreakerMotivation + visitWeek | VERIFIED | Lines 28-32 |
| `packages/db/src/schema.ts` | SCHEMA_V7 with keyMoments table + `...SCHEMA_V6` spread | VERIFIED | Lines 26-32; spreads SCHEMA_V6; `DB_VERSION = 7` |
| `packages/db/src/dynasty-db.ts` | version(7).stores(SCHEMA_V7) + keyMoments Table<KeyMoment, string> | VERIFIED | Lines 44, 52 |
| `apps/desktop/src/lib/rivalry-service.ts` | Dexie-backed getKeyMoments / addKeyMoment / deleteKeyMoment | VERIFIED | All three functions present; use `db.keyMoments`; no legacy prefs-store imports |
| `apps/desktop/src/lib/key-moments-migration.ts` | migrateKeyMomentsFromPrefsStore() with idempotency flag | VERIFIED | Function exported; `key-moments-migrated-to-dexie-v7` flag; `rival-moments-` prefix used |
| `apps/desktop/src/lib/export-import.ts` | DynastyExport v3+ with rivals[] + keyMoments[]; v1/v2 backward compat | VERIFIED | Version union is `1 | 2 | 3 | 4`; exports at version 4; rivals + keyMoments in both direct-insert and remap paths; validateExport accepts all four |
| `apps/desktop/src/App.tsx` | migrateKeyMomentsFromPrefsStore() called on startup | VERIFIED | Line 6 imports; line 118: `void migrateKeyMomentsFromPrefsStore()` after loadAll |
| `apps/desktop/src/lib/cfb-categories.ts` | CFB_DEAL_BREAKER_CATEGORIES (14) + DEV_TRAITS + DEV_TRAIT_LABEL + DEV_TRAIT_BADGE | VERIFIED | All 14 categories present; all four exports confirmed |
| `apps/desktop/src/components/AddPlayerModal.tsx` | Dev Trait selector; persists devTrait | VERIFIED | useState, selector render, `devTrait === '' ? undefined : devTrait` in handleSubmit |
| `apps/desktop/src/components/EditPlayerModal.tsx` | Dev Trait + Deal Breaker (CFB) + Redshirt (CFB) fields | VERIFIED | All three states, sync in useEffect, sport-gated DB/RS block, persistence with CFB guard |
| `apps/desktop/src/pages/RosterPage.tsx` | Trait/DB/RS badges in Name cell sub-line | VERIFIED | `DEV_TRAIT_BADGE` indexing, orange DB badge, red RS badge, all sport-gated correctly |
| `apps/desktop/src/pages/PlayerProfilePage.tsx` | Dev Trait field in bio grid | VERIFIED | `DEV_TRAIT_BADGE` used, conditional render on `player.devTrait` |
| `apps/desktop/src/components/SeasonEndModal.tsx` | Bowl Opponent (CFB) + Key Events textarea; sport prop | VERIFIED | `sport: SportType` in props; both state hooks; `{sport === 'cfb' && (...)}` gate; persistence payload includes both fields |
| `apps/desktop/src/lib/timeline-service.ts` | Zero `(season as any)` casts | VERIFIED | `grep -c "(season as any)"` → 0; direct `season.bowlOpponent` and `season.keyEvents` access |
| `apps/desktop/src/pages/RecruitingPage.tsx` | 5 motivation/visitWeek form fields + M1/M2/M3/DB pills + Week N text | VERIFIED | All 5 fields in RecruitFormData + defaultRecruitForm + addRecruit payload; pills and plain text confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/db/src/dynasty-db.ts` | `@dynasty-os/core-types KeyMoment` | `import type { KeyMoment }` | WIRED | Line 21 |
| `packages/db/src/dynasty-db.ts` | `SCHEMA_V7` | `version(7).stores(SCHEMA_V7)` | WIRED | Line 52 |
| `packages/db/src/schema.ts` | v6 base | `...SCHEMA_V6` spread in SCHEMA_V7 | WIRED | Line 27; all 18 prior tables preserved |
| `apps/desktop/src/App.tsx` | key-moments-migration | import + `void migrateKeyMomentsFromPrefsStore()` | WIRED | Lines 6, 118 |
| `apps/desktop/src/lib/rivalry-service.ts` | `@dynasty-os/db` | `db.keyMoments` (get/add/delete) | WIRED | Lines 79-116 |
| `apps/desktop/src/lib/export-import.ts` | `db.keyMoments` | export read + import bulkAdd (both paths) | WIRED | Lines 66, 171, 309 |
| `apps/desktop/src/components/AddPlayerModal.tsx` | `usePlayerStore.addPlayer` | `devTrait:` in submit payload | WIRED | Line 71 |
| `apps/desktop/src/components/EditPlayerModal.tsx` | `usePlayerStore.updatePlayer` | `devTrait/dealBreaker/isRedshirt` in submit payload | WIRED | Lines 100-102 |
| `apps/desktop/src/pages/RosterPage.tsx` | Tooltip component | `<Tooltip content={...}>` wrapping all three badge types | WIRED | Lines 345-363 |
| `apps/desktop/src/components/SeasonEndModal.tsx` | `useSeasonStore.updateSeason` | `keyEvents/bowlOpponent` in payload | WIRED | Lines 55-57 |
| `apps/desktop/src/pages/RecruitingPage.tsx` | `useRecruitingStore.addRecruit` | 5 new fields in addRecruit payload | WIRED | Lines 183-187 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `RivalryTrackerPage.tsx` | `keyMoments` map | `getKeyMoments(dynastyId, rivalId)` → `db.keyMoments.where('[dynastyId+rivalId]').equals([...]).toArray()` | Yes — Dexie compound index query | FLOWING |
| `RosterPage.tsx` | `players` | `usePlayerStore` → `db.players.where('dynastyId')` | Yes — Dexie store | FLOWING |
| `RecruitingPage.tsx` | `recruitsForClass` | `useRecruitingStore` → `db.recruits` | Yes — Dexie store | FLOWING |
| `ProgramTimelinePage.tsx` | `nodes[].bowlOpponent`, `nodes[].keyEvents` | `getTimelineNodes()` → `timeline-service.ts` direct `season.bowlOpponent` / `season.keyEvents` | Yes — direct Season field access, no cast | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compilation — desktop app | `pnpm --filter @dynasty-os/desktop exec tsc --noEmit` | exit 0, zero errors | PASS |
| `(season as any)` cast count in entire src/ | `grep -rn "(season as any)" apps/desktop/src/` | 0 matches | PASS |
| `(db as any)` cast count | `grep -rn "(db as any)" apps/desktop/src/` | 0 matches | PASS |
| KeyMoment dist artifact exists | `ls packages/core-types/dist/key-moment.d.ts` | file exists | PASS |
| keyMoments in db dist declaration | `grep -c "keyMoments" packages/db/dist/dynasty-db.d.ts` | 1 | PASS |
| 14 CFB categories in cfb-categories.ts | count of all 14 category strings | 14 | PASS |
| Dexie version chain preserved (v1/v4/v5/v6) | grep version() lines in dynasty-db.ts | 4 prior version calls confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| DMOD-01 | Plans 21-01, 21-02 | Rivalry key moments in Dexie keyMoments table; export/import round-trip | SATISFIED | db.keyMoments table in SCHEMA_V7; rivalry-service backed by Dexie; DynastyExport v4 with rivals+keyMoments; rivalIdMap remap path |
| DMOD-02 | Plans 21-01, 21-04 | Season.bowlOpponent + keyEvents; SeasonEndModal captures both; no (season as any) casts | SATISFIED | Fields on Season type; SeasonEndModal with sport prop; timeline-service cast count = 0 |
| DMOD-03 | Plans 21-01, 21-03 | Player.devTrait; selector in AddPlayerModal + EditPlayerModal; colored badge on roster + profile | SATISFIED | devTrait field on Player type; selectors in both modals with persistence; DEV_TRAIT_BADGE used in RosterPage + PlayerProfilePage |
| DMOD-04 | Plans 21-01, 21-03 | Player.dealBreaker (14 CFB categories) + isRedshirt; EditPlayerModal CFB fields; roster DB/RS badges | SATISFIED | Fields on Player type; CFB-gated fields in EditPlayerModal; orange DB + red RS badges in RosterPage with sport gate |
| DMOD-05 | Plans 21-01, 21-04 | Recruit.motivation1/2/3 + dealBreakerMotivation + visitWeek; form fields + recruit card display | SATISFIED | All 5 fields on Recruit type; RecruitFormData extended; addRecruit payload wired; M1/M2/M3/DB pills + plain Week N text on recruit row |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No blockers found | — | — |

Notes on findings:
- All HTML input `placeholder` attributes matched the stub scanner but are legitimate UI placeholders, not code stubs.
- `DEV_TRAIT_BADGE` is confirmed as a `Record<DevTrait, string>` constant, not a function (the 21-04 SUMMARY's wording was ambiguous but the code is correct).
- Export version went to `1 | 2 | 3 | 4` (the plan specified v3, but additional work bumped it to v4). The union still accepts all prior versions; backward compatibility is preserved. The DMOD-01 round-trip requirement is met.
- `deleteKeyMoment` signature changed from `(rivalId, year, description)` to `(id: string)` — a security/correctness improvement. The call site in `RivalryTrackerPage.tsx` uses `moment.id` correctly. No orphaned callers.
- `getKeyMoments` signature changed from `(rivalId)` to `(dynastyId, rivalId)` — uses the compound index `[dynastyId+rivalId]` for stronger dynasty isolation (T-21-05 mitigation). Call sites updated correctly.

### Human Verification Required

#### 1. Key Moment Export/Import Round-Trip

**Test:** In a CFB dynasty, add a key moment to a rivalry ("2025: First CFP Win"). Export the dynasty. On a fresh IndexedDB (or after deleting the dynasty), import the exported JSON. Navigate to Rivalry Tracker.
**Expected:** The key moment appears under the correct rival with the original year and description. The rival itself is also present (imported via the `rivals[]` array in the v4 export).
**Why human:** Requires the Tauri app running with a real IndexedDB instance; the export → JSON file → import path cannot be verified statically.

#### 2. SeasonEndModal Sport-Gating (Bowl Opponent field)

**Test:** Open SeasonEndModal in a CFB dynasty. Then open it in a Madden dynasty.
**Expected:** CFB: "Bowl / Playoff Opponent" input appears between Bowl Game and Bowl Result. Madden: the field is absent. "Key Events" textarea appears in both.
**Why human:** Conditional JSX rendering requires a running browser to confirm actual DOM output.

#### 3. Dev Trait Colored Badge Rendering

**Test:** Edit a player to set devTrait = 'superstar'. View on Roster and Player Profile.
**Expected:** Roster row sub-line shows purple badge ("Superstar") with tooltip "Superstar Development Trait". Player Profile bio grid shows the same purple badge. No badge sub-line for players without devTrait set.
**Why human:** Tailwind class rendering and Tooltip hover behavior require a running browser.

#### 4. CFB Deal Breaker and Redshirt Badges

**Test:** Edit a CFB dynasty player: set dealBreaker = 'Playing Time', isRedshirt = true. View on Roster. Then view a Madden dynasty player with the same fields stored.
**Expected:** CFB roster: orange "DB" badge (tooltip: "Deal Breaker: Playing Time") + red "RS" badge (tooltip: "Redshirt") in sub-line. Madden roster: no DB or RS badges regardless of stored values.
**Why human:** Sport-gating and tooltip rendering require a running browser.

#### 5. Recruit Motivation Pills

**Test:** Add a recruit with Motivation 1 = "Coach Reputation", Motivation 2 = "Playing Time", Motivation 3 = "Program Prestige", Deal Breaker Motivation = "NFL Draft Potential", Visit Week = "Week 5". View the recruit row.
**Expected:** Row sub-line shows M1 (hover: "Motivation 1: Coach Reputation"), M2, M3 blue pills + orange DB pill (hover: "Deal Breaker: NFL Draft Potential") + plain text "Week 5". A recruit with no motivations set shows no sub-line.
**Why human:** Pill rendering and native `title=` tooltip hover behavior require a running browser.

### Gaps Summary

No gaps found. All 4 ROADMAP success criteria are satisfied programmatically. Phase goal achieved in codebase.

The human_needed status reflects 5 visual/runtime behaviors that cannot be verified without a running Tauri app — they are not gaps but rather behaviors that require a human to confirm the UI renders as specified.

---

_Verified: 2026-05-04_
_Verifier: Claude (gsd-verifier)_
