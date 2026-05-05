# Phase 24: Recruiting Tools - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 24-recruiting-tools
**Areas discussed:** Recruit committed status, Hard Sell display placement, Signing Day Class Card, Draft pick → player status

---

## Recruit Committed Status

### Q1: How to model recruit commitment?

| Option | Description | Selected |
|--------|-------------|----------|
| Add isCommitted boolean | Add `isCommitted?: boolean` to Recruit type. Simple, minimal schema change. | ✓ |
| Add full status field | `status?: 'offered' \| 'visited' \| 'committed' \| 'decommitted'`. More expressive but more form complexity. | |
| Show button on all recruits | Skip the committed concept. 'Add to Roster' always visible. Contradicts roadmap language. | |

**User's choice:** `isCommitted?: boolean`
**Notes:** Simplest approach matching the spirit of the requirement.

### Q2: Where does the committed toggle surface?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on the recruit row | Small toggle directly on the list row. Fast to flip, no modal. | ✓ |
| In the add/edit recruit form | Checkbox inside AddRecruit form and edit modal. | |
| Both row toggle + form field | Toggle on row for quick access, also in form. | |

**User's choice:** Inline on the recruit row

### Q3: What happens to the recruit record after 'Add to Roster'?

| Option | Description | Selected |
|--------|-------------|----------|
| Leave unchanged | Recruit stays in class list as historical record. Modal just pre-fills AddPlayerModal fields. | ✓ |
| Mark as converted | Set isConverted flag; remove from active class view. | |
| Delete the recruit | Remove from Dexie after conversion. Cleanest but loses record. | |

**User's choice:** Leave unchanged

---

## Hard Sell Display Placement

### Q1: When does the Hard Sell recommendation appear on RecruitingPage?

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time inline in the add form | Banner appears instantly below grade inputs as all 3 are filled. No save required. | ✓ |
| On the saved recruit row only | Badge shows on row after saving a recruit with 3 grades. | |
| Both — form preview + row badge | Real-time preview in form AND persistent badge on row. | |

**User's choice:** Real-time inline in the add form

### Q2: Should motivation grade inputs become dropdowns?

| Option | Description | Selected |
|--------|-------------|----------|
| Change to dropdowns | Select with all 13 valid grade options. Prevents invalid inputs. | ✓ |
| Keep as text inputs | Leave free-text. Calculator guards against invalid grades. | |

**User's choice:** Change to dropdowns (A+ through F, 13 options)

### Q3: Should Hard Sell also show on the recruit row?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — badge on the recruit row | Compact 'HS' or 'STH' badge on recruits with all 3 grades saved. | ✓ |
| No — form only | Only show during entry. Keeps rows clean. | |

**User's choice:** Yes — badge on the recruit row

---

## Signing Day Class Card

### Q1: How should the PNG be generated?

| Option | Description | Selected |
|--------|-------------|----------|
| html2canvas | Render hidden React component to canvas via html2canvas, export via Tauri dialog.save(). | ✓ |
| SVG → canvas → PNG | Build as SVG string, draw to canvas. More control but more verbose. | |
| Canvas API directly | Draw with Canvas 2D API. Full control, no deps, most manual work. | |

**User's choice:** html2canvas

### Q2: What visual style for the card?

| Option | Description | Selected |
|--------|-------------|----------|
| Stats-forward dark card | Dark slate background. Large commit count + avg stars, position breakdown, top 3 recruits by name. | ✓ |
| Signing Day announcement style | Celebratory — bold school name, confetti, recruits prominent. Social media graphic style. | |
| You decide | Let planner/executor choose design. | |

**User's choice:** Stats-forward dark card matching app's slate theme

### Q3: Where does the button live, and how does export work?

| Option | Description | Selected |
|--------|-------------|----------|
| RecruitingPage class header + Tauri dialog.save() | Button alongside 'Generate AI Grade'. OS native save dialog, default filename 'signing-day-{year}.png'. | ✓ |
| Dedicated export modal | Preview modal before export. More polish but extra step. | |
| Auto-download to Downloads | Write directly to ~/Downloads. Faster but no user control. | |

**User's choice:** RecruitingPage class header + Tauri dialog.save()

---

## Draft Pick → Player Status

### Q1: Where should the player-status side effect live?

| Option | Description | Selected |
|--------|-------------|----------|
| Service layer in draft-service.ts | Extend createDraftPick() to also update player status. Single atomic operation. | ✓ |
| In the draft store's addPick action | Add update in useDraftStore.addPick() after createDraftPick(). | |
| In the form handler (DraftTrackerPage) | Form manually updates player status after addPick() resolves. | |

**User's choice:** Service layer in `draft-service.ts`

### Q2: Should it always override existing player status?

| Option | Description | Selected |
|--------|-------------|----------|
| Always override to 'drafted' | 'drafted' is definitive. No conditional logic. | ✓ |
| Only override 'active' status | Guard against accidental overwrites of graduated/transferred. | |
| Show confirmation if conflict | Brief warning if existing status isn't 'active'. | |

**User's choice:** Always override to 'drafted'

### Q3: Should Phase 24 add a player-link picker to the Add Draft Pick form?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — add player search/select | Combobox to link pick to existing Player. Required for TOOL-04 to work in practice. | ✓ |
| No — playerId only set programmatically | Skip UI picker; playerId set by future integrations only. | |

**User's choice:** Yes — add player search/select combobox to the Add Draft Pick form

---

## Claude's Discretion

- **At-risk filter implementation detail (TOOL-02):** Orange tag color, filter toggle UI treatment, and FilterStore integration details left to the planner. Direction: follow Phase 11 FilterStore pattern.

## Deferred Ideas

None — discussion stayed within phase scope.
