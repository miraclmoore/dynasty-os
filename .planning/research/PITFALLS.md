# Pitfalls Research

**Domain:** Tauri 2 + React + Dexie + Claude API desktop app (v2.0 milestone — 33 new features)
**Researched:** 2026-02-24
**Confidence:** HIGH (stack-specific findings verified against official docs and Tauri GitHub issues)

---

## Critical Pitfalls

### Pitfall 1: localStorage AI Cache Quota Explosion

**What goes wrong:**
The existing codebase already caches AI narratives in `localStorage` via `dynasty-os-narrative-{seasonId}` keys. Adding 12 AI features (Living Chronicle, Generational Player Arcs, Obituary Room, Opponent Dossiers, Rival Prophecy, Journalist blurbs, DNA Report, Momentum Heat Map, What If Engine, Hot Seat scores, Cross-Dynasty Intelligence, and Broadcast Booth TTS fragments) — each storing results in `localStorage` — will exhaust the 5–10 MiB localStorage quota in a normal multi-season dynasty. Claude response blobs average 400–2,000 characters per call; a 5-year dynasty with weekly Journalist blurbs and Living Chronicle updates will hit quota within months of use.

**Why it happens:**
It worked fine for Phase 4 (one narrative per season). The pattern was correct at single-feature scale. Adding 12 features that all follow the same cache pattern without a budget multiplies storage 12x without any eviction strategy.

**How to avoid:**
Before adding any new AI feature, migrate ALL AI caches from `localStorage` to a dedicated Dexie table (`aiCache` store with `key, dynastyId, generatedAt, content` columns). Add an LRU eviction policy: keep at most the 100 most recently accessed entries per dynasty. Add a `StorageManager.estimate()` check at app startup and warn the user if storage exceeds 80% quota. Never store per-game AI blurbs without a cap on number of entries.

**Warning signs:**
- `QuotaExceededError` thrown silently inside `try {}` blocks (the existing code suppresses these)
- AI features stop generating results with no visible error
- localStorage inspector shows `dynasty-os-*` keys consuming more than 2 MB

**Phase to address:** Phase 1 of v2.0 (AI infrastructure foundation). This must be resolved before ANY new AI feature is built. Every AI feature added before this is fixed will need to be migrated again later.

---

### Pitfall 2: Living Chronicle / Journalist Blocking the UI on Every Save

**What goes wrong:**
The Living Chronicle and The Journalist features are described as "real-time AI updates triggered by data saves." If these call `fetch('https://api.anthropic.com/v1/messages')` inside a Zustand action's `then()` chain — the pattern used by all existing stores — they block the loading spinner and make every game log write feel slow (Claude Sonnet averages 3–8 seconds for a full narrative response). Users logging a quick weekly game entry will wait 5+ seconds for AI they didn't ask for.

**Why it happens:**
The existing `generate()` pattern in `narrative-store.ts` awaits the Claude call before resolving. Developers copy this pattern because it works. When the trigger is a data save rather than an explicit user action, the same await becomes invisible latency.

**How to avoid:**
AI features triggered by data events must NEVER be in the synchronous save path. Use a fire-and-forget enqueue pattern: after `db.games.add(...)` completes successfully, push the job into an in-memory queue (a Zustand store with `pendingAiJobs: Job[]`). A background processor drains the queue with a concurrency limit of 1 and rate limiting. Show a subtle "Chronicle updating..." indicator in the UI that resolves independently of the save operation. The user's save should complete in under 200ms; AI is bonus content that populates asynchronously.

**Warning signs:**
- Log Game modal stays open for multiple seconds after clicking "Save"
- Achievement engine fires and toast shows, but the page doesn't return to dashboard
- Users report the app "feeling slow after logging a game"

**Phase to address:** Phase 1 of v2.0 (AI infrastructure). Design the AI job queue before building Living Chronicle (Phase X AI features). This is the most likely cause of the app feeling laggy mid-milestone.

---

### Pitfall 3: Dexie Migration Version Collision — Adding 5+ Tables at Once

**What goes wrong:**
The current `dynasty-db.ts` shows versions 1, 4, and 5 defined (versions 2 and 3 are missing, suggesting prior ad-hoc bumps). Adding 5+ new tables for v2.0 (e.g., `coachingStaff`, `aiCache`, `playerLinks`, `nilLedger`, `scheduleBuilder`) in a single version bump to v6 will work in development but can fail for existing users if:
1. Version 4 → 6 upgrade path has no `.upgrade()` migration function and the old schema is inconsistent
2. Two tables are added across two separate version bumps in the same branch without a clear version plan
3. IndexedDB opens at version 6 on one tab while another tab still has version 5 open, triggering a `versionchange` event that is not handled — the app deadlocks

**Why it happens:**
Dexie allows schema changes without `upgrade()` callbacks when only adding new empty tables, which works for a fresh install but masks migration ordering issues. The skipped versions (2 and 3) suggest the schema has been bumped ad-hoc without a written protocol. With 5+ new tables across a multi-phase milestone, version planning will drift further without explicit governance.

**How to avoid:**
- Establish a version plan before any code is written: v6 for the first set of new tables (aiCache, coachingStaff), v7 for the next (playerLinks, nilLedger, scheduleBuilder), etc. Document this in the schema file.
- Add a `versionchange` event handler on `db.on('versionchange')` that calls `db.close()` and prompts the user to reload. Without this, multi-tab usage will deadlock.
- Never add a new `this.version(N).stores(...)` call without adding the same version number to the SCHEMA constant and a comment noting what changed in that version.
- Test by downgrading: open the app with v5 data, update to v6 code, verify all existing data is intact.

**Warning signs:**
- "Database is closing" errors in the console
- App loads but all dynasties are missing after an update
- `VersionError: The requested version (6) is less than the existing version (7)` — happens when a developer bumps version in the wrong order

**Phase to address:** Phase 1 of v2.0 (infrastructure). Define the complete v2.0 version roadmap before any feature phase begins. A migration plan document living next to `schema.ts` is not optional.

---

### Pitfall 4: Cmd+K Palette Swallowed by macOS WebView

**What goes wrong:**
The Cmd+K keyboard shortcut requires a `keydown` event listener on `document`. On macOS, Tauri uses WKWebView (WebKit). A confirmed Tauri bug (Issue #8676) shows that Command-key shortcuts don't fire on the WebView until the parent Tauri window itself receives focus first — but since the app is Windows-only at v1, this is not immediately critical. On Windows with WebView2, a separate confirmed issue (Issue #5464) shows that the WebView does not receive keyboard events at all until the user clicks inside the WebView at least once. This means if the user launches the app and immediately presses Ctrl+K without clicking, nothing happens.

**Why it happens:**
Tauri's WRY layer mediates keyboard events between the OS and the WebView. Focus management for the WebView is an ongoing pain point in the Tauri ecosystem with multiple open issues. The problem is invisible in development because developers always click before pressing keys.

**How to avoid:**
- Focus the WebView programmatically at app startup via Tauri's `window.setFocus()` or by autofocusing a hidden input element on mount.
- Use Tauri's `tauri-plugin-global-shortcut` for Ctrl+K registration at the OS level rather than relying on DOM `keydown` events. This fires reliably regardless of WebView focus state.
- If using DOM `keydown`, add a `mouseenter` listener on `document` that explicitly calls `.focus()` on `document.body` to ensure the WebView has received a focus signal before keyboard listeners activate.
- Test keyboard shortcuts on a fresh app launch before any mouse interaction as part of every release checklist.

**Warning signs:**
- Cmd+K works in dev but not in the packaged app
- Keyboard shortcuts work after clicking but not on launch
- Users report the shortcut being unreliable

**Phase to address:** QOL phase (Cmd+K palette feature). Do not rely on DOM keydown as the sole shortcut registration mechanism.

---

### Pitfall 5: Single-Level Undo with Stale Closure State

**What goes wrong:**
Implementing undo by storing the "previous state" snapshot inside a Zustand action creates a stale closure problem. If the undo state is captured at action time (`const prev = get().games`) and then the user performs a different action before undoing, the `prev` snapshot is now based on state that may have been modified by the achievement engine, auto-export, or any fire-and-forget side effect that ran between the original action and the undo. Executing the undo restores a state that was never the actual DB state at undo time.

**Why it happens:**
Developers store `previousState` as a JavaScript object snapshot. The Zustand in-memory state is the snapshot's source, but the DB (Dexie) is the ground truth. If the achievement engine writes a new achievement record between action and undo, the undo restores Zustand state but does NOT un-write the achievement. The DB and the Zustand store are now inconsistent.

**How to avoid:**
- Undo must operate on the DB, not on Zustand snapshots. Store the undo payload as a DB-level operation descriptor: `{ table: 'games', operation: 'delete', id: 'xyz' }` rather than a full state snapshot.
- Only support undo for simple, reversible DB operations: game log add (undo = delete by id), player edit (undo = re-write previous values by id), stat edit (undo = re-write). Do NOT undo compound operations like a Madden sync commit.
- After executing an undo, call the same `loadX()` pattern that every other mutation calls. The DB is the source of truth; Zustand always reflects the DB.
- Cap the undo stack at 1 entry (as specified) to limit the surface area of this problem.

**Warning signs:**
- Undo removes a game log entry but the achievement for "10 wins" remains in the trophy room
- Stats total does not recalculate correctly after undo
- "Undo" button is greyed out after fire-and-forget AI jobs write to the store

**Phase to address:** QOL phase (undo feature). Design the undo payload as a DB operation descriptor from the start — retrofitting this is painful.

---

### Pitfall 6: Auto-Export Race Condition and Disk Write Errors

**What goes wrong:**
Auto-sync/live data export (background JSON/CSV on every save) uses `tauri-plugin-fs` to write files. If the export is triggered on every Dexie mutation and two mutations fire in quick succession (e.g., a Madden sync commit writes 8 games in a loop), the export function fires 8 times concurrently for the same file path. On Windows, concurrent writes to the same file path from the same process can cause `EBUSY` or partial-write corruption. The existing `commitSyncDiff()` in `madden-sync-service.ts` uses a `for` loop with individual `await createGame()` calls — each of which could trigger an export event.

**Why it happens:**
The mutation-triggered export is conceptually simple but treats each DB write as an isolated event. It does not account for burst writes. The Tauri `writeFile` API does not queue or serialize by path.

**How to avoid:**
- Debounce the export trigger: use a 2-second debounce so that a burst of 20 mutations within a sync commit triggers exactly ONE export, not 20.
- Use a write lock (a simple `boolean` flag in the export service module) so that if an export is already in progress, the next trigger queues a single pending export rather than spawning a concurrent one.
- Write to a `.tmp` file first, then rename to the final path atomically using Tauri's `rename` command. This prevents partial reads by external tools (e.g., the user's backup software reading a half-written export).
- Never export during the commit phase of Madden sync. Export only after `commitSyncDiff()` resolves successfully.

**Warning signs:**
- Exported JSON file is malformed or truncated
- Console shows `EBUSY` or Tauri `writeFile` errors on game log saves
- Auto-export file size occasionally drops to 0 bytes

**Phase to address:** Community features phase (auto-sync feature). The debounce and write lock must be in the initial implementation, not added later.

---

### Pitfall 7: CFB-to-Madden Player Link Orphaning on Dynasty Delete

**What goes wrong:**
The CFB-to-Madden player continuity feature stores links between a `Player` record in a CFB dynasty and a `Player` record in a Madden dynasty. If the user deletes either dynasty, the linked player records are deleted but the link table entries remain, creating orphaned rows that reference IDs that no longer exist. On a future query, these orphaned links may surface phantom player data or cause Dexie query errors when trying to resolve the linked player.

**Why it happens:**
Dexie has no foreign key constraints or automatic cascade delete. The existing `deleteDynasty` in `dynasty-store.ts` calls `svcDelete(id)` which presumably cleans up the dynasty's own records, but the link table is cross-dynasty and lives outside the normal dynasty-scoped cleanup path.

**How to avoid:**
- Implement a `Table.hook('deleting')` on the `players` table that checks for and deletes any `playerLinks` entries referencing the deleted player's ID.
- Alternatively, wrap dynasty deletion in a transaction that explicitly queries and deletes all cross-dynasty links before deleting the dynasty. Add this to the `deleteDynasty` service function.
- Store links with both `cfbDynastyId` and `maddenDynastyId` as indexed columns so that a `WHERE cfbDynastyId = X OR maddenDynastyId = X` query can find all affected links quickly.
- Add a data integrity check that runs on app startup (or on demand) that scans for orphaned links and offers to clean them up.

**Warning signs:**
- Player profile page shows a "linked NFL counterpart" but clicking it navigates to a missing player
- Dexie `get()` call returns `undefined` for a linked player ID that should exist
- Dynasty deletion takes longer than expected (incomplete cleanup)

**Phase to address:** Community features phase (CFB-to-Madden linking feature). The cascade delete hook must be written alongside the feature — not as a follow-up.

---

### Pitfall 8: Web Speech API / TTS Voice Availability on Windows WebView2

**What goes wrong:**
The Broadcast Booth / Audio Mode feature relies on `window.speechSynthesis`. On Windows (the v1 target platform), WebView2 uses the Chromium engine and `speechSynthesis` is available, but the available voices depend on what Windows TTS voices are installed on the user's machine. A minimum Windows installation may have only one voice (Microsoft David, or the default system voice). Users on non-English system locales may have no suitable English voice. On development machines (typically macOS or fully-configured Windows machines), dozens of voices are available — the feature appears to work perfectly in development and then silently falls back to a robot voice or no voice at all for most users.

**Why it happens:**
`window.speechSynthesis.getVoices()` returns different results on every machine. The spec allows `getVoices()` to return an empty array before voices are asynchronously loaded — a common bug is calling `getVoices()` synchronously and getting `[]`, then reporting no voices are available.

**How to avoid:**
- Never assume voices are available. Always check: `speechSynthesis.addEventListener('voiceschanged', ...)` and only populate voice selection after the event fires.
- Default to the system default voice if no preferred voice is found. Do not error — degrade gracefully.
- Show the user a voice selector UI populated by `getVoices()` on the settings page. Let the user pick their preferred voice.
- Test explicitly with Windows Narrator disabled and only the default Microsoft David voice available.
- Consider providing a fallback: if `speechSynthesis.getVoices().length === 0`, show a "TTS not available — install Windows voices in Settings" message with a link to the Windows TTS settings.
- The confirmed Tauri GitHub discussion (#8784) shows Web Speech API is undefined on Linux (not a v1 concern) but works on Windows WebView2. MacOS WKWebView also supports it. No platform-level block on v1 target (Windows), but voice availability varies.

**Warning signs:**
- TTS plays a robotic, clearly non-preferred voice without warning
- `getVoices()` returns `[]` when called at component mount
- Feature works in development (macOS) but produces no audio on Windows CI builds

**Phase to address:** AI features phase (Broadcast Booth feature). Add voice availability detection and graceful fallback from day one of the feature.

---

### Pitfall 9: What If Engine Hallucination Due to Stale Data Snapshots

**What goes wrong:**
The What If Engine sends dynasty data to Claude and asks "what if X had happened differently?" If the snapshot sent to Claude is constructed from current Zustand state rather than a point-in-time DB query, it may include partially-loaded data. For example, if the player roster is loaded but the player seasons are still being fetched (the existing `loadX()` pattern is async), Claude receives an incomplete roster and generates counterfactuals based on a roster missing half the players. The hallucination is not obvious — Claude confidently generates a plausible but fabricated outcome based on incomplete data.

**Why it happens:**
The existing stores load data independently and asynchronously. `playerStore.loadPlayers()` and `playerSeasonStore.loadPlayerSeasons()` are separate calls. The What If Engine, if it reads from Zustand state at trigger time, may read one before the other has resolved.

**How to avoid:**
- Build all What If prompts from direct Dexie queries (`await db.players.where('dynastyId').equals(id).toArray()`) rather than Zustand state. Dexie reads are synchronous-to-the-read-transaction — the data is complete or the query fails, never partially complete.
- Add a data completeness assertion before sending to Claude: verify that the number of player records, seasons, and games matches expectations (e.g., `if (games.length === 0) throw new Error('No game data available for counterfactual')`).
- Always include the data snapshot metadata in the prompt: "As of Season 2025 (12 games logged, 47 players on roster)." This allows the user to recognize if something is off.
- Cap the What If Engine to only operate on completed seasons (seasons where `season.isComplete === true`), not in-progress seasons where data is still being entered.

**Warning signs:**
- What If results reference players not on the current roster
- Counterfactuals ignore entire seasons of data
- Claude refers to the team as having 0 wins when there are logged wins

**Phase to address:** AI features phase (What If Engine). Data completeness validation is a prerequisite, not a follow-up.

---

### Pitfall 10: Toast Notification z-Index War with Modals

**What goes wrong:**
The HTML `<dialog>` element uses the browser's top-layer, which is above any CSS `z-index` value. If the existing modal system in Dynasty OS uses `<dialog>` elements (or if the new Cmd+K palette uses one), any toast notification rendered via a React portal with a high `z-index` will appear BEHIND the open dialog. Users will see a toast fire during a modal interaction (e.g., saving a recruit inside the recruiting modal) and the toast will be invisible — it's playing behind the modal's top-layer context.

**Why it happens:**
The browser top-layer (used by `<dialog>`, browser `alert()`, fullscreen elements) stacks above CSS z-index regardless of value. This is a confirmed, documented behavior. Toast libraries that use portals and `z-index: 9999` are not immune. The react-toastify GitHub issue tracker has a specific open issue for this pattern.

**How to avoid:**
- Do not use `<dialog>` for modals in the existing codebase if toasts must appear above them. Use a `<div>` with `position: fixed` and managed `z-index` instead — this keeps everything in the same stacking context.
- If `<dialog>` is already in use, render toasts INSIDE the dialog's DOM subtree when a dialog is open, so they participate in the same top-layer context.
- Use a toast library like `sonner` (used by shadcn/ui) which handles this explicitly via its portal target configuration.
- Add a test case: open a modal, trigger a save that would produce a toast, verify the toast is visible.

**Warning signs:**
- Toast messages disappear immediately after a save from a modal
- Users report "I saved but saw no confirmation"
- Toast animations play (visible in DevTools) but the element is visually hidden

**Phase to address:** QOL phase (toast system). Choose the stacking approach before writing a single modal component in v2.0. Retrofitting stacking context is painful.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Caching all AI in localStorage | Easy to implement, matches existing pattern | Quota explosion with 12 AI features, silent failures | Never for v2.0 — migrate to Dexie aiCache table immediately |
| Calling Claude on every data save (fire-and-forget) | Simple trigger logic | Uncontrolled API cost, rate limit errors, perceived latency | Never — always use a job queue with debounce |
| Single SCHEMA constant for all Dexie versions | Easy to reason about for single-version app | Cannot reconstruct migration history, upgrade functions impossible | Never after v5 — each version needs its own schema diff |
| Using Zustand state snapshot for undo | Simple to implement | DB/UI inconsistency when side effects run between action and undo | Never — use DB operation descriptors |
| Adding all 33 features to the existing switch-case page router | Simple — matches existing pattern | App.tsx switch grows to 50+ cases, bundle is never split | Acceptable through v2.0 but add React.lazy per-page before release |
| Storing cross-dynasty links without cascade delete hooks | Fast to ship | Orphaned records accumulate silently | Never — implement cascade on the same PR as the feature |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude API (direct browser fetch) | Triggering multiple concurrent requests for the same content (e.g., two components both detecting a stale narrative and calling Claude) | Use an in-progress flag per content key: `pendingAiKeys: Set<string>` — skip if key already in flight |
| Claude API caching | Relying on Anthropic's server-side prompt cache (5-minute TTL) for content that users regenerate hours later | Local Dexie cache is the primary cache; Anthropic's prompt cache only helps with rapid repeated identical prompts |
| Tauri `writeFile` | Writing to the same path from multiple concurrent async calls | Serialize writes per path using a mutex or debounce; never fire concurrent writes to the same path |
| Tauri sidecar (madden-reader) | Spawning multiple sidecar instances for watcher polling | The existing madden-watcher.ts pattern must ensure only one watcher interval is active; add an `isWatching` guard |
| Dexie `versionchange` | Not handling the versionchange event — deadlocks multi-tab usage | Add `db.on('versionchange', () => { db.close(); location.reload(); })` in `dynasty-db.ts` |
| Web Speech API | Calling `getVoices()` synchronously at mount | Always wait for the `voiceschanged` event; voices are loaded asynchronously |
| Achievement engine (fire-and-forget) | Achievement engine firing on undo operations and awarding achievements for actions that were immediately undone | Guard achievement checks against "undo in progress" state; or only trigger achievements after a debounce period |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `loadX()` called in every component on mount | Each page load triggers 5-10 Dexie reads simultaneously; fine at <500 records | Implement a "loaded" flag per store; skip reload if data is fresh (<60s) | Breaks at 5+ years of dynasty data (~2,000+ records per store) |
| All 33 new pages eagerly imported in App.tsx | Cold start increases from <3s target toward 5-8s as bundle grows | Use `React.lazy(() => import('./pages/NewPage'))` with `Suspense` for all new pages | Breaks at ~15+ page components without code splitting |
| AI job queue with no concurrency limit | Multiple AI calls fire in parallel; Claude rate limits trigger 429 errors silently | Enforce max 1 concurrent AI call globally; queue all others | Breaks if user triggers 3+ AI features in rapid succession |
| Per-game Journalist blurb generation (every game logged = 1 API call) | API costs grow linearly with game logging activity; active users log 16 games/season | Generate Journalist blurbs in batches (end of week/season), never per-game-save | Breaks at ~50 games logged in a single session (weekly sync) |
| Cross-Dynasty Intelligence querying all dynasties simultaneously | Dexie opens transactions across all dynastyId partitions at once; no query cap | Add a dynasty cap (max 5 dynasties analyzed); paginate results; show progress | Breaks at >10 dynasties with full season history each |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Anthropic API key in localStorage (existing pattern from Phase 4) | Key is readable by any JS running in the WebView; not a production risk for a single-user desktop app but a concern if the app ever opens external URLs | Acceptable for v1 (local app, no external content loaded); document that this should move to Tauri's secure store (keyring) in v2+ |
| Sending full dynasty data (player names, season history) to Claude API | User data leaves the device; acceptable if user understands this | Show a clear "AI features send dynasty data to Anthropic API" disclosure in settings on first AI use |
| Auto-export writing files to `downloads/` without user consent | Unexpected file creation on user's machine | The first time auto-export is enabled, prompt the user to choose the export directory using Tauri's dialog; persist the choice; never write without explicit user opt-in |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Toast notifications firing for every Dexie write in a Madden sync commit (8+ toasts for one sync) | Toast storm — 8 toasts stacking for one user action | Show one aggregated toast per user-level action ("Synced 8 games") not per DB write |
| Coaching staff tenure calculation using wall-clock dates vs. in-game years | Tenure shows "0 years" for a coach hired 3 in-game seasons ago if hire date is stored as a real date | Store hire/fire events as in-game season year (integer), not as real-world timestamps |
| Playoff bracket simulator persisting half-completed bracket state | User partially fills bracket, navigates away, returns to reset bracket | Persist bracket state in Dexie per-season; restore on re-entry; add explicit "Reset bracket" button |
| Season timeline scrubber triggering expensive Dexie queries on every drag tick | UI stutters during drag on long dynasties | Debounce the scrubber's query trigger by 150ms; show season year label immediately, load data after debounce settles |
| Cmd+K palette including all 33 new pages/actions without filtering | Palette becomes overwhelming; users can't find what they need quickly | Implement context-aware filtering: if on RosterPage, surface player actions first; limit palette to 10 visible items with search |

---

## "Looks Done But Isn't" Checklist

- [ ] **AI cache migration:** AI features appear to cache correctly — verify that cache writes go to Dexie `aiCache` table, not `localStorage`, and that LRU eviction runs
- [ ] **Undo across side effects:** Undo removes the game log entry — verify that the achievement count in the trophy room also reverts correctly
- [ ] **Auto-export debounce:** Auto-export fires after Madden sync commit — verify it fires ONCE for a 20-game sync, not 20 times
- [ ] **Coaching staff lifecycle:** Tenure shows correctly for a coach hired in Season 2022, fired in Season 2024 — verify with a dynasty that has gone through a coaching change
- [ ] **CFB-to-Madden link orphan cleanup:** Delete a CFB dynasty that has linked players — verify the `playerLinks` table has zero entries for the deleted dynasty's players
- [ ] **Toast z-index:** Open the "Log Game" modal, save a game, verify the success toast is visible ABOVE the modal
- [ ] **Keyboard shortcuts on cold launch:** Package the app, launch it, press Ctrl+K without clicking — verify palette opens (not just in dev server)
- [ ] **TTS voice availability:** Run on a minimal Windows install (or VM), verify Broadcast Booth falls back gracefully when only the default system voice is available
- [ ] **Dexie versionchange:** Open the app in two tabs (Tauri doesn't typically multi-window, but test during development with two browser instances), update schema version — verify no deadlock
- [ ] **Living Chronicle rate limit:** Log 10 games in rapid succession — verify Claude is called at most once, not 10 times

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| localStorage quota exceeded | MEDIUM | Add `StorageManager.estimate()` + emergency eviction: iterate all `dynasty-os-*` keys and delete the oldest 50%, then retry the failed write |
| Dexie migration deadlock | HIGH | Add a `versionchange` handler that closes the DB and reloads; if already deadlocked, users must clear IndexedDB via browser DevTools — provide a "Reset Database" escape hatch in settings |
| AI job queue runaway (API cost explosion) | MEDIUM | Add a per-session AI call counter cap (e.g., max 20 Claude calls per app session); once exceeded, queue further jobs without executing and show "AI updates paused — too many requests" |
| Orphaned CFB-Madden player links | LOW | Build a "Clean up orphaned data" option in Settings that runs integrity check queries and deletes orphaned rows |
| Corrupted auto-export file | LOW | The source of truth is Dexie, not the export file. Provide "Re-export now" button in Settings that re-triggers a clean export |
| Undo / DB inconsistency | MEDIUM | On undo execution failure, call `loadX()` for all affected stores to re-sync Zustand from DB ground truth; never leave Zustand in a state that doesn't reflect Dexie |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| localStorage AI cache quota explosion | Phase 1: AI infrastructure (before any AI feature) | Storage inspector shows `aiCache` Dexie table, zero AI keys in localStorage |
| Living Chronicle blocking the save path | Phase 1: AI infrastructure (job queue before feature) | Log a game — save resolves in <500ms; AI populates async |
| Dexie migration version collision | Phase 1: DB migration plan (before any new table) | Fresh install and upgrade-from-v5 both work; no `VersionError` in console |
| Cmd+K swallowed by WebView | QOL phase (Cmd+K feature) | Cold launch on packaged Windows build; Ctrl+K opens palette without prior click |
| Undo stale closure / DB inconsistency | QOL phase (undo feature) | Undo a game log, verify trophy room achievement count correct |
| Auto-export race condition | Community features phase (auto-sync feature) | 20-game Madden sync produces exactly 1 export file write |
| CFB-Madden link orphaning | Community features phase (player linking feature) | Delete CFB dynasty; verify playerLinks table empty for that dynasty |
| TTS voice availability gaps | AI features phase (Broadcast Booth) | Test on minimal Windows voice install; graceful fallback shown |
| What If hallucination / stale data | AI features phase (What If Engine) | Assert game count > 0 before Claude call; test on in-progress season |
| Toast z-index behind modals | QOL phase (toast system, first PR) | Save from inside modal; toast is visible above modal |

---

## Sources

- Tauri keyboard event issues: [Issue #8676](https://github.com/tauri-apps/tauri/issues/8676), [Issue #5464](https://github.com/tauri-apps/tauri/issues/5464), [Issue #13919](https://github.com/tauri-apps/tauri/issues/13919)
- Tauri global shortcut plugin: [v2.tauri.app/plugin/global-shortcut](https://v2.tauri.app/plugin/global-shortcut/)
- Tauri macOS keyboard intercept plugin: [tauri-plugin-key-intercept](https://github.com/yigitkonur/tauri-plugin-key-intercept)
- Dexie migration documentation: [Version.upgrade()](https://dexie.org/docs/Version/Version.upgrade()), [versionchange event](https://dexie.org/docs/Dexie/Dexie.on.versionchange)
- Dexie cascade delete: [Issue #1932](https://github.com/dexie/Dexie.js/issues/1932), [Table.hook('deleting')](https://dexie.org/docs/Table/Table.hook('deleting'))
- IndexedDB performance (single DB vs multiple): [RxDB IndexedDB slowness](https://rxdb.info/slow-indexeddb.html), [Chrome dev blog](https://developer.chrome.com/blog/maximum-idb-performance-with-storage-buckets)
- localStorage quota limits: [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- Toast z-index with dialog top-layer: [react-toastify Issue #139](https://github.com/fkhadra/react-toastify/issues/139)
- Web Speech API WebView2: [Tauri Discussion #8784](https://github.com/tauri-apps/tauri/discussions/8784), [caniwebview.com speech recognition](https://caniwebview.com/features/web-feature-speech-recognition/)
- Claude API rate limits and cost: [Anthropic rate limits docs](https://platform.claude.com/docs/en/api/rate-limits), [Reducing latency](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency)
- LLM hallucination grounding: [Lakera hallucination guide 2025](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models)
- React code splitting with Vite: [Vite code splitting guide](https://medium.com/@akashsdas_dev/code-splitting-in-react-w-vite-eae8a9c39f6e)
- cmdk command palette: [cmdk.paco.me](https://cmdk.paco.me/)

---
*Pitfalls research for: Tauri 2 + React + Dexie + Claude API — Dynasty OS v2.0 (33-feature milestone)*
*Researched: 2026-02-24*
