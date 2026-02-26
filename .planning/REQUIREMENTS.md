# Requirements: Dynasty OS

**Defined:** 2026-02-25
**Core Value:** The memory layer, narrative engine, and legacy vault that sports games never built — transforming raw dynasty data into stories that persist, compound, and can be shared.

## v2.1 Requirements

Requirements for the UX/UI Polish milestone. Each maps to roadmap phases.

### Onboarding

- [ ] **ONBD-01**: After creating a new dynasty, the onboarding tour auto-launches on the dashboard and walks through every main screen section — sidebar, Log Game, End Season, SeasonAtGlance, RecentActivity, WeeklySnapshot, StatHighlights, QuickEntryHub, Season Checklist, GameLog — each highlighted with the spotlight mechanism and a popup explaining what it does
- [ ] **ONBD-02**: Existing user can re-trigger the tour at any time from a persistent `?` button or Settings entry point
- [ ] **ONBD-03**: SetupWizard description text renders at readable opacity (remove `text-blue-300/60` dimming)

### Navigation

- [ ] **NAV-01**: User can navigate back to the previous page from any non-root inner page via a back button or breadcrumb
- [ ] **NAV-02**: User can see their current page context (page title + optional parent) without checking the sidebar

### Tooltips & Entry Surfaces

- [ ] **TIP-01**: Tooltips triggered from sidebar items do not overflow or clip at viewport edges
- [ ] **TIP-02**: Tooltip placement auto-adjusts to the available side when the default placement lacks space
- [ ] **ENTRY-01**: QuickEntryHub category labels are large enough to scan at a glance (increased font size)

### Data Display

- [ ] **DISP-01**: GameLog notes that exceed one line show an inline expand control to read the full note without opening a modal
- [ ] **DISP-02**: All inner pages identified as sparse in a page audit have meaningful content structure and non-trivial empty states

### Error States

- [ ] **ERR-01**: Recap API errors display a human-readable message instead of a raw error string
- [ ] **ERR-02**: Recap API error UI includes a specific actionable suggestion (check API key, verify connection, retry)

## Future Requirements

Features acknowledged but deferred beyond v2.1.

### Onboarding

- **ONBD-04**: Per-page contextual tips shown the first time a user visits a new inner page
- **ONBD-05**: Interactive "try it" steps during tour (e.g. clicking Log Game during the tour step)

### Navigation

- **NAV-03**: Global search / jump-to-page from any screen (already partially covered by Cmd+K palette)

### Data Display

- **DISP-03**: Player profile page inline stat editing without navigating to a separate edit form

## Out of Scope

Explicitly excluded from v2.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Redesigning existing page layouts | Polish pass only — layout changes belong in a dedicated design milestone |
| New data entry forms or fields | Not a data model milestone |
| AI-generated tooltips or tour copy | Would require prompt engineering iteration; not a v2.1 priority |
| Mobile / responsive layout work | Desktop-only app; responsive work deferred to V3+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ONBD-01 | TBD | Pending |
| ONBD-02 | TBD | Pending |
| ONBD-03 | TBD | Pending |
| NAV-01 | TBD | Pending |
| NAV-02 | TBD | Pending |
| TIP-01 | TBD | Pending |
| TIP-02 | TBD | Pending |
| ENTRY-01 | TBD | Pending |
| DISP-01 | TBD | Pending |
| DISP-02 | TBD | Pending |
| ERR-01 | TBD | Pending |
| ERR-02 | TBD | Pending |

**Coverage:**
- v2.1 requirements: 12 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 12 ⚠️

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
