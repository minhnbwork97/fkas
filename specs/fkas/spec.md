# Feature Specification: FKAS (FC Không Giải Tán Attendance System)

**Feature Branch**: `[001-fkas]`  
**Created**: 2025-10-08  
**Status**: Draft  
**Input**: User description: "Attendance + fund management for FC Không Giải Tán; weekly matches Sat 19:00; announce Wed; confirm by Sat 10:00; late notice by Sat 16:00; internal match (min 14, max 20) or vs team (min 7, max 13); collect attendance via Facebook comments; post-match split 600,000 VND evenly; support prepaid team fund deductions."

## User Scenarios & Testing (mandatory)

### User Story 1 - Collect weekly attendance from Facebook (Priority: P1)

As the organizer, I want to create a weekly match event and import attendance intents from Facebook comments so I can quickly see who plans to join.

**Why this priority**: This is the core flow needed to know if a match can proceed.

**Independent Test**: Using a test post or mocked comment payload, verify that comments like "1", "yes", "0.5", "0", and notes (e.g., "coming late") result in correct attendance statuses in the app.

**Acceptance Scenarios**:

1. Given a scheduled match for Saturday 19:00, When I import comments of "1" and "yes", Then those users become Attending.
2. Given users commenting "0" or "0.0", When imported, Then those users become Not Going.
3. Given a user comments "0.5" or "undecided", When imported, Then that user becomes Tentative.
4. Given a user comments "coming late" or "late", When imported, Then the user is Attending with a Late flag and an optional note.

---

### User Story 2 - Enforce confirmation deadlines (Priority: P1)

As the organizer, I want the system to enforce team rules for confirmation and late notice so I can manage fairness and predictability.

**Why this priority**: Deadlines determine if the match is viable and inform communications.

**Independent Test**: Simulate current time relative to Saturday and verify rule enforcement messages and status locks.

**Acceptance Scenarios**:

1. Given it is Saturday 09:59, When a player sets attendance, Then it is accepted; at 10:00, further confirmations require organizer override.
2. Given it is Saturday 15:59, When a player flags Late, Then it is accepted; at 16:00, late flags require organizer override.
3. Given a match type is Internal (min 14, max 20), When confirmed count reaches 14 by 18:00, Then status is Ready; otherwise Not Ready.
4. Given a match type is Vs Team (min 7, max 13), When confirmed count reaches 7 by 18:00, Then status is Ready; otherwise Not Ready.

---

### User Story 3 - Attendance updates and audit trail (Priority: P2)

As a player, I can update my attendance by commenting again, and the system keeps the latest status with a history for reference.

**Why this priority**: Players change plans; organizer needs clarity.

**Independent Test**: Post multiple updates for the same user; verify final status and a history list.

**Acceptance Scenarios**:

1. Given a player was Attending, When they comment "0", Then status becomes Not Going and history shows the change.
2. Given a player is Tentative, When they comment "1", Then status becomes Attending and history records the update.

---

### User Story 4 - Post‑match settlement and cost split (Priority: P1)

As the organizer, I want to record actual attendees at the field and split the 600,000 VND cost evenly among them.

**Why this priority**: Handles the core financial reconciliation after each match.

**Independent Test**: Provide a list of actual attendees; verify per‑person amount and deductions.

**Acceptance Scenarios**:

1. Given actual attendees count N>0, When I confirm the list, Then each pays floor(600,000 / N) with remainder handled by rounding strategy (see Requirements).
2. Given some attendees have prepaid balances, When settling, Then their dues are deducted from balances and remaining to‑pay is updated accordingly.

---

### User Story 5 - Team fund and prepaid balances (Priority: P2)

As a treasurer, I can add top‑ups to member balances and view transactions so post‑match collection is minimized.

**Why this priority**: Speeds up payment and reduces cash handling.

**Independent Test**: Add top‑ups, perform a settlement, verify balance changes and transaction records.

**Acceptance Scenarios**:

1. Given a member tops up 200,000 VND, When recorded, Then their balance increases and a transaction is logged.
2. Given a settlement charges 50,000 VND, When applied, Then balance decreases and the transaction references the match.

---

### Edge Cases

- Duplicate comments by same user: latest valid comment wins; maintain history.
- Comments with extra text (e.g., "1, but late"): parse status and note.
- Ambiguous comments: mark as Tentative and require organizer resolution.
- Timezone handling: all deadlines computed in Asia/Ho_Chi_Minh.
- Headcount limits: reject new Attending if max reached; allow waitlist.
- Facebook name to player mapping conflicts: provide manual mapping dialog.
- Match cancellation: if Ready threshold not met by 18:00, notify as Not Ready.

## Requirements (mandatory)

### Functional Requirements

- FR-001: System MUST allow creating a weekly match schedule with type: Internal or Vs Team.
- FR-002: System MUST import or manually enter attendance intents from Facebook comments.
- FR-003: System MUST parse comment intents: "1"/"yes" => Attending; "0" => Not Going; "0.5" => Tentative; detect Late note.
- FR-004: System MUST allow organizer override for statuses after deadlines.
- FR-005: System MUST enforce deadlines: confirm by Saturday 10:00; late notice by Saturday 16:00; compute Ready by 18:00.
- FR-006: System MUST compute readiness against thresholds (Internal: min 14, max 20; Vs Team: min 7, max 13).
- FR-007: System MUST record actual attendees and split 600,000 VND evenly.
- FR-008: System MUST support prepaid balances: top‑ups, deductions, and transaction history.
- FR-009: System MUST provide a simple dashboard summarizing counts, readiness, and payment status.
- FR-010: System SHOULD support a one‑click scripted smoke test to validate primary flows (see Constitution).

### Non‑Functional/Policy Requirements (Constitution Alignment)

- NF-001: Automated unit tests are OPTIONAL for this small project; provide manual verification checklist and smoke script.
- NF-002: Enforce consistent UX patterns and accessibility where applicable.
- NF-003: Keep UI minimal: primary tasks within 1–2 clicks; inline validation.
- NF-004: Performance target: p95 key interactions < 200ms; initial load < 2s.

### Key Entities

- Player: id, name, Facebook profile link (optional), balance, transactions[]
- Match: id, dateTime, type (Internal|VsTeam), status (Draft|Collecting|Ready|NotReady|Settled)
- AttendanceIntent: id, matchId, playerId, status (Attending|Tentative|NotGoing), isLate, note, source (FB|Manual), createdAt
- AttendanceActual: id, matchId, playerId
- Transaction: id, playerId, matchId (optional), type (TopUp|Charge|Refund), amount, createdAt, note

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-001: Organizer can produce a ready/not‑ready decision by 18:00 Saturday for 90% of weeks.
- SC-002: Importing attendance for a week takes < 60 seconds including mapping.
- SC-003: Post‑match settlement takes < 2 minutes; per‑player amounts computed correctly for 100% of cases.
- SC-004: 80% of payments are auto‑deducted from prepaid balances or require no cash.
- SC-005: Smoke script completes successfully on a fresh clone in < 2 minutes.

### Calculation Notes

- Default split: perPerson = floor(600000 / N). Remainder = 600000 - perPerson \* N. Remainder handling policy: charge remainder to team fund if available; otherwise organizer rounds up the last payer.

## Notes

- For initial MVP, Facebook integration can be manual: copy comment text and paste; parsing handles core keywords.
- A future enhancement may add Facebook Graph API integration.
- Keep deployment simple (single binary/script or lightweight web app); one‑command run.
