# Tasks: FKAS Attendance Onboarding

**Input**: Design documents from
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested (per Constitution, use manual checklist + smoke script)
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format:

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1..US8 per spec.md
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 14 App Router project in with TypeScript
- [x] T002 Install Tailwind CSS and configure base theme tokens
- [x] T003 Install shadcn/ui and generate base components (Button, Input, Select, Checkbox, Dialog)
- [x] T004 Install Prisma and @prisma/client; run in
- [x] T005 Create with , , in
- [x] T006 Create smoke script SMOKE: create match -> submit attendance -> readiness -> settlement (create match → submit 1/0/0.5 → deadlines → readiness → settlement)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T007 Configure Supabase connection for prod: set (see quickstart)
- [x] T008 Configure SQLite for local dev:
- [x] T009 Define Prisma schema from in
- [x] T010 Run initial Prisma migration for dev and generate client
- [x] T011 [P] Add simple Admin PIN guard util in
- [x] T012 [P] Add minimal logging util (structured logs) in
- [x] T013 Create base layout and design tokens in and
- [x] T014 Add timezone utilities (Asia/Ho_Chi_Minh) and readiness calculator (guests included)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create weekly match and share link/QR (Priority: P1)

**Goal**: Organizer creates Saturday 19:00 match and obtains unique link/QR and join code
**Independent Test**: Create a match → copy link/QR → link opens correct attendance page

### Implementation

- [x] T015 [P] Create organizer dashboard page
- [x] T016 Create match creation form (dateTime, type, optional fieldCost) in
- [x] T017 Implement API route (POST) using Prisma (contracts: /matches)
- [x] T018 Generate join code and store on Match; show link and QR in UI
- [x] T019 [P] Add QR generator utility and client component

**Checkpoint**: US1 independently testable

---

## Phase 4: User Story 2 - Submit/update attendance simply (Priority: P1)

**Goal**: Players mark 1/0.5/0; Late note; +N guests; optimistic update ≤1s
**Independent Test**: Submit each status; verify counts and UI updates immediately

### Implementation

- [x] T020 Create attendance page
- [x] T021 Add status controls (1/0.5/0), Late toggle + note, guest counter
- [x] T022 Implement API route (POST) (contracts)
- [x] T023 [P] Add optimistic UI + toast feedback; recompute local totals

**Checkpoint**: US2 independently testable

---

## Phase 5: User Story 3 - Enforce deadlines (Priority: P1)

**Goal**: Confirm by Sat 10:00; Late by Sat 18:00; readiness at 18:00 using thresholds and guests
**Independent Test**: Simulate time windows; verify locks and readiness flag

### Implementation

- [x] T024 Add deadline logic to attendance API using
- [x] T025 Add readiness API (GET) (contracts)
- [x] T026 Show readiness banner on organizer and attendance pages

**Checkpoint**: US3 independently testable

---

## Phase 6: User Story 4 - Smooth migration UX (Priority: P1)

**Goal**: Familiar labels (1/0.5/0), short explainer, show current status for returning visit
**Independent Test**: First-time player completes attendance in < 20 seconds

### Implementation

- [x] T027 Add explainer and microcopy to attendance page
- [x] T028 Persist and display current player status for quick change

**Checkpoint**: US4 independently testable

---

## Phase 7: User Story 5 - Alternative entry (join code) (Priority: P2)

**Goal**: Enter 6-char code to land on match attendance page
**Independent Test**: Enter valid code → navigate to match page

### Implementation

- [x] T029 Create home/join page with code form
- [x] T030 Implement code-lookup API (GET)

**Checkpoint**: US5 independently testable

---

## Phase 8: User Story 6 - Post‑match actuals and split (Priority: P2)

**Goal**: Confirm actual attendees; split cost evenly (default fieldCost 600k if unset); deduct prepaids
**Independent Test**: Confirm N attendees → per-person computed; balances adjusted

### Implementation

- [x] T031 Add organizer settlement page
- [x] T032 Implement settlement API (POST) (contracts)
- [x] T033 Update transactions and balances; render summary

**Checkpoint**: US6 independently testable

---

## Phase 9: User Story 7 - Dynamic match type and variable field cost (Priority: P1)

**Goal**: Change type before 18:00; set fieldCost per match
**Independent Test**: Change type and cost; readiness uses new values; split uses cost

### Implementation

- [x] T034 Add edit controls on organizer dashboard for type and fieldCost (guarded by time)
- [x] T035 Update API to persist change; enforce 18:00 cutoff

**Checkpoint**: US7 independently testable

---

## Phase 10: User Story 8 - Team fund management (Priority: P1)

**Goal**: Record income/expense; view running balance
**Independent Test**: Add entries; balance updates as expected

### Implementation

- [x] T036 Add fund page
- [x] T037 Implement fund entry API (POST/GET)

**Checkpoint**: US8 independently testable

---

## Approvals & Roster (supporting flows)

- [x] T038 Self-claim page (name, optional phone)
- [x] T039 Self-claim API (POST)
- [x] T040 Approval queue (Admin PIN protected)
- [x] T041 Decide roster request API (POST) (contracts)
- [x] T042 Unknown device re-bind flow (queue + one-tap approve)

---

## Polish & Cross-Cutting Concerns

- [x] T043 [P] Add structured logging for submit/update, approvals, readiness, settlement
- [x] T044 [P] Error/empty/loading states for major pages
- [x] T045 [P] Performance pass (p95 interactions <200ms, initial <2s)
- [x] T046 [P] UX consistency pass (components, spacing, contrast)
- [x] T047 [P] Smoke script run and fix issues
- [x] T048 Update skeleton for match-detail-page.tsx to match new interface structure (radio buttons, compact layout, grid layout)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Foundational (Phase 2) → User Stories (3+)
- Stories are independent after Phase 2; execute in priority (P1s first), or in parallel if staffing allows

### User Story Dependencies

- US1 (P1): none after Phase 2
- US2 (P1): depends on US1 match creation
- US3 (P1): depends on US2 for attendance data
- US4 (P1): depends on US2 UI
- US5 (P2): independent after Phase 2
- US6 (P2): depends on US1 and attendance data
- US7 (P1): depends on US1
- US8 (P1): independent after Phase 2

### Parallel Examples

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1) and verify via smoke script
3. Deploy/demo

### Incremental Delivery

1. Add US2 → verify → deploy
2. Add US3/US4 (P1) → verify → deploy
3. Add US7/US8 (P1) → verify → deploy
4. Add US5/US6 (P2) → verify → deploy
