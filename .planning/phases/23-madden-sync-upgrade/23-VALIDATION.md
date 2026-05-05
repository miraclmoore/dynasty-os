---
phase: 23
slug: madden-sync-upgrade
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-04
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none (TypeScript build check only — no test runner installed) |
| **Config file** | apps/desktop/tsconfig.json |
| **Quick run command** | `pnpm --filter @dynasty-os/desktop build` |
| **Full suite command** | `pnpm --filter @dynasty-os/desktop build` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @dynasty-os/desktop build`
- **After every plan wave:** Run `pnpm --filter @dynasty-os/desktop build`
- **Before `/gsd-verify-work`:** Build must exit 0
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | MSYN-01 | T-23-01-01 | Stats written to DB not exposed over network | build | `node -e "const f=require('fs').readFileSync('apps/desktop/src-tauri/sidecar/madden-reader.cjs','utf8'); ['PlayerStats','Player Stats','Stats','CareerStats'].forEach(n=>{if(!f.includes(n))throw new Error(n);}); console.log('ok')"` | ✅ | ⬜ pending |
| 23-01-02 | 01 | 1 | MSYN-01 | T-23-01-05 | Upsert guard prevents duplicate seasons | build | `pnpm --filter @dynasty-os/desktop build` | ✅ | ⬜ pending |
| 23-02-01 | 02 | 1 | MSYN-02 | T-23-02-01 | Path discovery reads Documents/Temp only | build | `node -e "const f=JSON.parse(require('fs').readFileSync('apps/desktop/src-tauri/capabilities/default.json','utf8')); ['fs:allow-read-dir','fs:scope-document-recursive','fs:scope-temp-recursive'].forEach(p=>{if(!f.permissions.includes(p))throw new Error(p);}); console.log('ok')"` | ✅ | ⬜ pending |
| 23-02-02 | 02 | 1 | MSYN-02 | T-23-02-02 | Paths constructed via Tauri join() | build | `pnpm --filter @dynasty-os/desktop build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing test infrastructure covers TypeScript/type checks
- MSYN-02 (auto-detect save files) requires manual verification with a real Madden franchise file at the expected path

*"Existing infrastructure covers automated type and unit verification. Manual verification required for filesystem path detection."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auto-detect franchise file on mount | MSYN-02 | Requires real Madden franchise file at known save path | Place an `.frs` file in `%LOCALAPPDATA%\Temp\Madden NFL {year}\` (Windows) or equivalent, launch app, open MaddenSyncPage, confirm file appears in auto-detected list |
| Stats written after sync | MSYN-01 | Requires real `.frs` file with PlayerStats table | Sync the file, open Player Profile, confirm non-zero stat values appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
