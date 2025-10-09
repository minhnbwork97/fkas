# Feature Specification: FKAS Onboarding (No Facebook Integration)

**Feature Branch**: `001-fkas-attendance-onboarding`  
**Created**: 2025-10-08  
**Status**: Draft  
**Input**: "Late notice is Sat 18:00. No Facebook integration. Use link/QR in the existing group to route players to the new system; keep the flow simple and familiar to migrate from comment-based attendance."

## Clarifications

### Session 2025-10-08

- Q: How should players be identified when submitting attendance (no login)? → A: Per-player magic link tokens shared weekly.
- Q: Where does the player roster come from for sending magic links? → A: Players self-claim via generic link; organizer approves to add to roster.
- Q: How do returning players get their link each week? → A: Use join code; app recognizes them via device cookie; no personal link shown.
- Q: How does the organizer authenticate to approve self-claims and manage matches? → A: Admin PIN set in env.
- Q: What is the maximum guest count per player? → A: No hard cap; guestCount can be >2; organizer monitors capacity.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create weekly match and share link/QR (Priority: P1)

As the organizer, I create the Saturday 19:00 match and get a shareable link/QR to post in the group so players can mark attendance in FKAS.

**Why this priority**: Provides the entry point without integrating with Facebook.

**Independent Test**: Create a match → generate link/QR → open link and land on the correct attendance page.

**Acceptance Scenarios**:

1. Given a Saturday 19:00 match, When created, Then a unique link and QR are available for sharing.
2. Given the link is opened, When accessed by a player, Then the attendance page shows simple options.

---

### User Story 2 - Submit/update attendance simply (Priority: P1)

As a player, I can mark 1 (Attending), 0.5 (Tentative), or 0 (Not Going), and optionally mark Late with a note. I can also indicate invited guests using +1/+2.

**Why this priority**: Mirrors the familiar comment shorthand to reduce friction.

**Independent Test**: Submit each status and verify the UI reflects the new status within ≤1s and can be changed later. Add +1/+2 and verify guest slots appear and count toward capacity and settlement.

**Acceptance Scenarios**:

1. Given the attendance page, When choosing 1, Then status becomes Attending.
2. Given the attendance page, When choosing 0, Then status becomes Not Going.
3. Given the attendance page, When choosing 0.5, Then status becomes Tentative.
4. Given I will arrive late, When toggling Late and adding a note, Then status includes Late and note.
5. Given I invite a friend, When I add +1 (or +2), Then guest slots are recorded and reflected in counts.

---

### User Story 3 - Enforce deadlines (Priority: P1)

As the organizer, I need confirmations by Sat 10:00 and late notices by Sat 18:00; after those, updates require override.

**Why this priority**: Ensures planning reliability.

**Independent Test**: Simulate time and attempt updates before/after cutoffs.

**Acceptance Scenarios**:

1. Given Sat 09:59, When a player confirms, Then it is accepted; at 10:00, confirmations need organizer override.
2. Given Sat 17:59, When a player sets Late, Then accepted; at 18:00, Late requires organizer override.
3. Given match type Internal (min 14, max 20) or Vs Team (min 7, max 13), When confirmed meets minimum by 18:00, Then status is Ready; else Not Ready.

---

### User Story 4 - Alternative entry (join code) (Priority: P2)

As a player, instead of scanning a QR or clicking a link, I can open FKAS and enter a short join code to land on the correct match attendance page.

**Why this priority**: Provides a backup method and reduces reliance on scanning or long links.

**Independent Test**: Generate a code → enter it on the home page → navigates to the right match.

**Acceptance Scenarios**:

1. Given a created match, When viewing organizer tools, Then a 6‑character join code is displayed.
2. Given I enter a valid code, When submitting, Then I land on the corresponding match attendance page.

---

### User Story 5 - Smooth migration UX (Priority: P1)

As a player used to comments, I see familiar labels (1 / 0.5 / 0) and a short explainer so it feels easy.

**Why this priority**: Encourages adoption without training.

**Independent Test**: First-time player completes attendance in < 20 seconds without help.

**Acceptance Scenarios**:

1. Given I arrive from a shared link, When viewing the page, Then I see concise explanation: 1=Attending, 0.5=Tentative, 0=Not Going.
2. Given I already submitted, When reopening link, Then I see my current status and can update with one tap.

---

### User Story 6 - Post‑match actuals and split (Priority: P2)

As the organizer, I record actual attendees and split 600,000 VND evenly; prepaid balances deduct first.

**Why this priority**: Handles payment simply.

**Independent Test**: Mark actuals and verify calculated dues and deductions.

**Acceptance Scenarios**:

1. Given N actual attendees, When confirming actuals, Then each pays floor(600,000 / N) and remainder handled per policy.
2. Given prepaid balances, When settling, Then deduct from balances first and show remaining to‑pay.

---

### User Story 7 - Dynamic match type and variable field cost (Priority: P1)

As the organizer, I can change the match type (Internal vs Vs Team) before the 18:00 readiness check, and set the field cost per match based on venue.

**Why this priority**: Reflects reality of scheduling and variable venue pricing.

**Independent Test**: Change type prior to cutoff and verify thresholds update; set field cost (default 600,000 VND if unset) and verify split uses the value.

**Acceptance Scenarios**:

1. Given a scheduled match, When I change type before 18:00, Then min/max thresholds update and readiness uses the new type.
2. Given I set field cost to X VND (or leave blank), When settling, Then per‑person amount is floor((X or 600,000) / N) and remainder policy applies.

---

### User Story 8 - Team fund management (Priority: P1)

As the treasurer, I can record fund income/expenses with timestamps, view current balance, and see a history of entries.

**Why this priority**: Transparency and simple bookkeeping for the team.

**Independent Test**: Add income and expense entries; verify running balance and list ordering by time.

**Acceptance Scenarios**:

1. Given fund balance B, When I add an income of A, Then balance becomes B + A and an entry is recorded with time and note.
2. Given fund balance B, When I add an expense of A, Then balance becomes B - A (if sufficient) and an entry is recorded with time and note.

### Edge Cases

- Multiple submissions by same player: latest wins; show current status.
- Capacity reached: block new Attending; allow Tentative/waitlist.
- Timezone: all deadlines use Asia/Ho_Chi_Minh.
- Link abuse: organizer can regenerate/disable link.
- Name mismatches: allow quick alias edit by organizer.
- Cleared cookies/new device: treat as unknown; queue for organizer one-tap approval to re-bind device.

## Requirements _(mandatory)_

### Functional Requirements

- FR-001: Create weekly match for Sat 19:00 with type Internal or Vs Team.
- FR-002: Generate shareable attendance link and QR for each match.
- FR-003: Allow statuses 1/0.5/0 and optional Late + note; allow later updates.
- FR-004: Enforce deadlines: confirm by Sat 10:00; Late by Sat 18:00; readiness check at 18:00.
- FR-005: Readiness thresholds: Internal min 14 (max 20); Vs Team min 7 (max 13).
- FR-005: Readiness thresholds: Internal min 14 (max 20); Vs Team min 7 (max 13). Guest seats contribute to totals: totalConfirmed = confirmedPlayers + sum(guestCount).
- FR-006: Organizer override after deadlines.
- FR-007: Record actual attendees and split 600,000 VND with remainder policy.
- FR-008: Support prepaid balances: top‑ups, deductions, and transaction history.
- FR-009: Minimal attendance page accessible via link/QR; no FB integration required.
- FR-010: Show migration explainer matching legacy shorthand (1, 0.5, 0).
- FR-011: Support guest invites via +N per player; guests count toward capacity and settlement.
- FR-012: Provide an alternative join method via a short join code (e.g., 6 characters) for each match.
- FR-013: Allow organizer to change match type until 18:00; thresholds recomputed accordingly.
- FR-014: Allow per‑match field cost entry; default to 600,000 VND if not set; settlement uses that value.
- FR-015: Provide team fund management: record income/expense entries with amount, timestamp, and note; show running balance and history.
- FR-016: Issue weekly per‑player magic link tokens that auto-map identity on open; tokens expire after match start or on organizer regeneration.
- FR-017: Provide a generic self-claim link for new players to submit name (and optional phone); organizer approval adds them to the roster and issues their magic link.
- FR-018: Recognize returning players via device cookie; when using join code or shared link, start attendance immediately if recognized; if device is new/unknown, require organizer approval once then bind device.
- FR-019: Gate organizer actions (approve self‑claims, device re‑bind, match create/settle) behind an Admin PIN provided at runtime; PIN value set via environment variable.

### Assumptions

- MVP uses per‑player weekly magic links for identification; no login required. Join code remains as a backup.
- Posting link/QR in the Facebook group reaches all players; no API integration.
- Self-claim link is posted in the Facebook group weekly; no per-player DMs required.
- Organizer can resolve duplicates or map names after the fact.
- Guests do not require full profiles for MVP; optional guest names may be captured.
- Join code is case‑insensitive and expires after match end or on organizer regeneration.
- First-time players use the self-claim link; organizer must approve before they appear in the roster.
- Simple duplicate prevention: treat same name + optional phone as same person; organizer can merge.
- Device recognition uses cookies/local storage; clearing cookies or switching device triggers re-approval once to re-bind.
- Admin access uses a simple PIN provided by the organizer (env: ADMIN_PIN). No user accounts required in MVP.

### Non‑Functional/Policy Requirements

- NF-001: Tests optional; provide manual checklist and smoke script (per Constitution v1.1.0).
- NF-002: Simple, consistent UX; primary task within 1–2 clicks.
- NF-003: Performance: p95 primary interactions < 200ms; initial view < 2s.
- NF-004: Observability: structured logs for attendance submit/update, organizer approvals, readiness evaluation, and settlement (minimal fields: matchId, playerId, action, outcome, latencyMs).

### Key Entities

- Player: id, name, balance, transactions[]
- Match: id, dateTime, type (Internal|VsTeam), status (Draft|Collecting|Ready|NotReady|Settled), link, qrCodeRef, joinCode, fieldCost
- AttendanceIntent: id, matchId, playerId, status (Attending|Tentative|NotGoing), isLate, note, guestCount, createdAt
- AttendanceActual: id, matchId, playerId
- Transaction: id, playerId, matchId (optional), type (TopUp|Charge|Refund), amount, createdAt, note
- TeamFundEntry: id, direction (Income|Expense), amount, createdAt, note
- MatchInviteToken: id, matchId, playerId, token, expiresAt, status (Active|Revoked|Used)
- PendingRosterRequest: id, name, phone (optional), createdAt, status (Pending|Approved|Rejected)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- SC-001: 90% of players complete attendance in < 20 seconds from link.
- SC-002: Organizer has readiness decision by 18:00 Sat for 95% of weeks.
- SC-003: Settlement completed in < 2 minutes with correct amounts.
- SC-004: 80% payments auto‑deducted from prepaid or require no cash.
- SC-005: Smoke script completes on fresh clone in < 2 minutes.

### Calculation Notes

- Default split: perPerson = floor(C / N) where C = fieldCost or 600000 if unset. Remainder = C - perPerson \* N. Remainder handling: use team fund if available; otherwise organizer rounds up the last payer.

## Future Work (Phase 2+)

- Punishment rules and fund: If a player confirms Attending but does not appear in actuals, fine 50,000 VND; fines accrue to a punishment fund; organizer can review and override before posting.
- Automated payment reconciliation: Provide per‑player payment instructions and QR; when a transfer matches expected amount/reference, mark as Paid; include manual mark‑as‑paid and discrepancy review.
- Additional entry options: consider short app shortcut or saved home‑screen link to reduce friction further.
