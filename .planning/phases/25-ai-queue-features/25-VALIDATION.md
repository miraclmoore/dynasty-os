---
phase: 25
slug: ai-queue-features
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-05
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test infrastructure detected in project |
| **Config file** | none |
| **Quick run command** | `pnpm --filter desktop build` |
| **Full suite command** | `pnpm --filter desktop build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter desktop build`
- **After every plan wave:** Run `pnpm --filter desktop build`
- **Before `/gsd-verify-work`:** Full build must be green + manual UAT walkthrough
- **Max feedback latency:** ~30 seconds (TypeScript compile gate)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | AIQE-03, AIQE-04 | T-25-01 / T-25-02 | AiJob.type union includes 'game-narrative'; HAIKU_MODEL/SONNET_MODEL constants defined; no model string literals | compile + grep | `grep -n "HAIKU_MODEL\|SONNET_MODEL" apps/desktop/src/lib/narrative-service.ts && grep -n "game-narrative" apps/desktop/src/store/ai-queue-store.ts` | ✅ | ⬜ pending |
| 25-01-02 | 01 | 1 | AIQE-04 | T-25-03 | logGame enqueues game-narrative only when hasApiKey; API key never in job payload | compile + grep | `grep -n "enqueueAiJob" apps/desktop/src/store/game-store.ts` | ✅ | ⬜ pending |
| 25-02-01 | 02 | 1 | AIQE-02 | — | No generateLegacyBlurb call in PlayerProfilePage useEffect; button labeled "Generate AI Blurb" | compile + grep | `grep -n "generateLegacyBlurb\|Generate AI Blurb" apps/desktop/src/pages/PlayerProfilePage.tsx` | ✅ | ⬜ pending |
| 25-03-01 | 03 | 2 | AIQE-01 | T-25-07 / T-25-08 | processingRef prevents double-processing; clearCompleted() called after every job | compile + grep | `grep -n "pendingAiJobs\|processJob\|clearCompleted" apps/desktop/src/App.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

*No test files needed — all validation is TypeScript compile gate + grep-based smoke checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Queue processes pending job to done/failed | AIQE-01 | No test framework; requires live Tauri runtime with API key | With API key set, log a game → open DevTools → check Zustand store (useAiQueueStore) for job transitioning pending→running→done |
| No API call on player profile navigate | AIQE-02 | Requires live Tauri runtime to observe network | Navigate to PlayerProfilePage → open DevTools Network tab → confirm no `api.anthropic.com` request fires on load |
| Game narrative uses Haiku, season uses Sonnet | AIQE-03 | Requires live API key and Tauri runtime | Log a game → check Tauri logs for model=claude-haiku-4-5-20251001; generate season narrative → check for model=claude-sonnet-4-6 |
| Game narrative auto-enqueued after logGame | AIQE-04 | Requires live Tauri runtime | With API key set, log a game → check Zustand store for a 'game-narrative' job appearing in pendingAiJobs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
