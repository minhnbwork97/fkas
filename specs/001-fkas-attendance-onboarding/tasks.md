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
- [x] T049 Add fund deduction when payment is marked (organizer or self-report) in settlement/payment/route.ts and self-report-payment/route.ts
- [x] T050 Allow negative player fund balances and ensure Transaction records track all balance changes (TopUp/Charge only)
- [x] T051 Create Autocomplete UI component and replace player selection dropdown with autocomplete in fund page
- [x] T052 Create CurrencyInput component with Vietnamese thousand separators and replace all money input fields (fund, create match, edit match)
- [x] T053 Update CurrencyInput to format numbers in real-time as user types for better visibility
- [x] T054 Update transaction notes to use format "Trừ tiền sân {dd/MM/yyyy}" when players pay for matches
- [x] T055 Create player transaction history API endpoint and display in organizer player list page
- [x] T056 Simplify fund model: remove TeamFundEntry, calculate total fund from player balances, require playerId for all transactions
- [x] T057 Display all transactions in fund page instead of player balances (balances already shown in players page)
- [x] T058 Add transaction balance tracking and filters: show balance before/after for each transaction, add player and date range filters
- [x] T059 Replace transaction type Select dropdown with radio buttons for easier interaction
- [x] T060 Create receivables management page: show unpaid settlements with filters by match and player, quick mark-as-paid action
- [x] T061 Make receivables items clickable to navigate to match settlement page with visual feedback
- [x] T062 Fix mark-as-paid API to support both PUT and PATCH methods, improve error handling for JSON parsing
- [x] T063 Add pagination to fund transaction history (10 items per page) with page controls and filter support
- [x] T064 Make transaction items clickable to navigate to match settlement page when transaction has matchId
- [x] T065 Add prominent warning card in fund page to display players with negative balance, sorted by most negative first
- [x] T066 Auto-calculate settlement when first entering the settlement page (no need to manually click "Calculate" button)
- [x] T067 Disable "Calculate" button when match is already Settled
- [x] T068 Auto-mark player settlements as paid and deduct from fund when confirming settlement (allow negative balance)
- [x] T069 Add fund balance display and deduction notification to player payment page: fetch player balance, show notification when paid that amount was deducted from fund, display current fund balance
- [x] T070 Add navigation header with quick route links to all management pages (Trang Chủ, Trận Đấu, Cầu Thủ, Quỹ Đội, Công Nợ) with active state highlighting
- [x] T071 Fix fund deduction logic: only auto-deduct from fund when marking payment as paid if player has previous transactions (indicating they've contributed to the fund)
- [x] T072 Fix payment page UI messaging: only show "đã được trừ vào quỹ" message if player has previous transactions (hasTransactions flag from API)
- [x] T073 Fix confirm-settlement to only auto-mark as paid for players with fund transactions; leave unpaid for players without fund (they need to pay cash manually)
- [x] T074 Fix settlement page UI bug: reload settlement data from backend after confirm-settlement instead of marking all players as paid in frontend
- [x] T075 Remove MatchInviteToken table and InviteStatus enum from database schema (not needed for current implementation)
- [x] T076 Fix TypeScript build errors: replace 'any' types with proper Prisma types (TransactionWhereInput, SettlementWhereInput) in fund and receivables API routes
- [x] T077 Create comprehensive onboarding guide on homepage with step-by-step instructions and screenshots (registration, attendance, payment flows)

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
