# Deferred Items — Phase 11 QOL Wins

## Pre-existing Build Errors (out of scope)

Found during 11-02 execution. These errors existed before any 11-02 changes.

### TS2352 — UndoableOperation snapshot cast errors

- `src/store/game-store.ts` lines 72, 108: `Game` cannot be cast directly to `Record<string, unknown>`
- `src/store/player-store.ts` lines 77, 111: `Player` cannot be cast directly to `Record<string, unknown>`

**Fix needed:** Change `as Record<string, unknown>` to `as unknown as Record<string, unknown>` in all 4 locations.

**Origin:** Phase 10-04 undo store changes — UndoableOperation.snapshot requires `Record<string, unknown>` but direct cast from typed entity is not safe in TypeScript strict mode.

**Impact:** Build fails. These pre-date Phase 11 and were introduced in Phase 10.
