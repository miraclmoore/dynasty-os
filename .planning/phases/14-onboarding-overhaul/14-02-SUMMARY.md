---
phase: 14-onboarding-overhaul
plan: 02
subsystem: ui
tags: [onboarding, tour, react, tooltip, sidebar, fix]

# Dependency graph
requires: [14-01]
provides:
  - Legible SetupWizard subtitle text (ONBD-03 — text-blue-300/60 → text-gray-400)
  - Human-verified sign-off on all 3 ONBD requirements
  - Tooltip clipping fix: position:fixed + getBoundingClientRect() escapes overflow containers
  - Sidebar nav items render on separate lines (inline-flex → block w-full)
affects: [15-navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed-position tooltip pattern: getBoundingClientRect() on mouseenter, position:fixed at screen coords — escapes any overflow container including sidebar overflow-y-auto"
    - "Tooltip wrapper block w-full: ensures each nav item with tooltip takes full width on its own line"

# Requirements satisfied
requirements:
  - ONBD-02: ? button re-triggers the full tour at any time from the dashboard ✓
  - ONBD-03: SetupWizard subtitle text is legible — no dimmed/opacity text ✓
  - ONBD-01: Tour auto-launches after new dynasty creation, cycles through 8 steps ✓ (human verified)

# Commits
commits:
  - 80cb898: fix(14-02): fix SetupWizard subtitle opacity (ONBD-03)
  - b775aee: fix(tooltip): fix clipping in overflow containers and nav item stacking
  - 4fc4305: fix(sidebar): allow overflow-visible so fixed tooltips aren't masked

# What was done
tasks:
  - task: Fix SetupWizard subtitle text
    files: [apps/desktop/src/components/SetupWizard.tsx]
    outcome: "text-blue-300/60 replaced with text-gray-400 — legible subtitle"

  - task: Human verify ONBD-01/02/03
    files: []
    outcome: "User approved — all 3 requirements pass"

  - task: Fix tooltip clipping and nav stacking (post-verify bugs)
    files:
      - apps/desktop/src/components/Tooltip.tsx
      - apps/desktop/src/pages/DashboardPage.tsx
    outcome: "Tooltips use position:fixed + getBoundingClientRect(); sidebar nav items render on separate lines"

# Decisions
decisions:
  - "Fixed-position tooltip: position:fixed with getBoundingClientRect() is the correct pattern for tooltips inside overflow-y:auto containers in Tauri WebView"
  - "Tooltip wrapper changed from inline-flex to block w-full: NavLink items with tooltips now each occupy their own row in the sidebar"
