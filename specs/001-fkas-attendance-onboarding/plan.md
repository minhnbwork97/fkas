# Implementation Plan: FKAS Attendance Onboarding

**Branch**: `001-fkas-attendance-onboarding` | **Date**: 2025-10-08 | **Spec**: /Users/minhnb/personal-projects/fkas/specs/001-fkas-attendance-onboarding/spec.md
**Input**: Feature specification from `/specs/001-fkas-attendance-onboarding/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable simple weekly attendance for FC Không Giải Tán without Facebook integration: organizer creates a match, shares link/QR/join code; players mark 1/0.5/0 (and Late, +1/+2). Enforce deadlines (Sat 10:00 confirm, 18:00 late). Set per‑match field cost (default 600,000 VND). Post‑match settlement splits evenly and deducts prepaids. Roster via self‑claim + organizer approval; returning players recognized via device cookies; unknown devices require re‑approval.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Next.js 14+)  
**Primary Dependencies**: Next.js (App Router), Tailwind (simple UI), shadcn/ui (component primitives), Zod (validation)  
**Storage**: Supabase (Postgres free tier) via Prisma; dev can use SQLite locally  
**Testing**: Manual checklist + scripted smoke test (per Constitution v1.1.0)  
**Target Platform**: Web app, deployed on Vercel  
**Project Type**: single web app  
**Performance Goals**: p95 interaction < 200ms; initial view < 2s  
**Constraints**: Very small project; keep UX minimal and consistent; avoid premature abstractions; free tier limits (Supabase)  
**Scale/Scope**: Single team usage (<100 users), weekly cadence

### UI/UX Design Decisions

- Style system: Tailwind CSS with a tiny design token set (colors, spacing, radius).
- Components: Minimal set built with accessible primitives (Button, Input, Select, Checkbox, Badge, Dialog/Drawer, Toast) using shadcn/ui for modern, accessible defaults.
- Layout: Mobile‑first; max content width 640px for primary flows; large tap targets; single‑column forms.
- Patterns: Clear primary CTA per screen; inline validation; optimistic UI for attendance toggle with ≤1s visible update.
- Accessibility: Keyboard navigable, ARIA labels for controls, color contrast meeting WCAG AA.
- States: Empty/Loading/Error templates for Attendance list, Approval queue, and Settlement.
- Copy: concise labels mirroring legacy shorthand (1 / 0.5 / 0); microcopy under controls as needed.

Screens/Flows (MVP):

- Home/Join: Enter join code; recognized players proceed directly to match attendance; unknowns see self‑claim form.
- Attendance: Toggle 1 / 0.5 / 0; Late flag + note; +1/+2 guest counter; live counts; readiness hint.
- Organizer Dashboard: Create match (type, field cost default 600k); share link/QR/join code; readiness status; quick actions.
- Approval Queue: Review self‑claims and unknown devices; one‑tap approve/deny with notes.
- Settlement: Confirm actual attendees; compute per‑person; deduct prepaids; export/share summary.
- Fund: Record income/expense; show running balances (team fund and, future, punishment fund).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Gates (must be enforced in PR/CI):

- Lint/format clean (project defaults)
- Scripted smoke test for primary flows (create match → submit 1/0/0.5 → deadlines → readiness → settlement)
- No P1/P2 static analysis/security issues in changed scope
- PR includes scope summary, user impact, screenshots for UI
- UX consistency check: design system components, accessible states

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: Single Next.js project with minimal pages and server actions; SQLite via Prisma. Tests limited to smoke script. No separate backend service.

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
