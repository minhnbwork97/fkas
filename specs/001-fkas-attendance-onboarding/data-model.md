# Data Model

## Entities

### Player

- id (uuid)
- name (string)
- phone (string, optional)
- balance (int, VND)
- createdAt (datetime)

### Match

- id (uuid)
- dateTime (datetime)
- type (enum: Internal|VsTeam)
- status (enum: Draft|Collecting|Ready|NotReady|Settled)
- fieldCost (int, VND)
- link (string)
- qrCodeRef (string)
- joinCode (string)
- createdAt (datetime)

### AttendanceIntent

- id (uuid)
- matchId (uuid, fk Match)
- playerId (uuid, fk Player)
- status (enum: Attending|Tentative|NotGoing)
- isLate (boolean)
- note (string, optional)
- guestCount (int, default 0, no upper cap)
- createdAt (datetime)

### AttendanceActual

- id (uuid)
- matchId (uuid, fk Match)
- playerId (uuid, fk Player)

### Transaction

- id (uuid)
- playerId (uuid, fk Player)
- matchId (uuid, fk Match, optional)
- type (enum: TopUp|Charge|Refund)
- amount (int, VND)
- note (string, optional)
- createdAt (datetime)

### TeamFundEntry

- id (uuid)
- direction (enum: Income|Expense)
- amount (int, VND)
- note (string, optional)
- createdAt (datetime)

### MatchInviteToken

- id (uuid)
- matchId (uuid, fk Match)
- playerId (uuid, fk Player)
- token (string)
- expiresAt (datetime)
- status (enum: Active|Revoked|Used)

### PendingRosterRequest

- id (uuid)
- name (string)
- phone (string, optional)
- createdAt (datetime)
- status (enum: Pending|Approved|Rejected)

## Relationships

- Player 1..\* Transaction
- Player 1..\* AttendanceIntent
- Match 1..\* AttendanceIntent
- Match 1..\* AttendanceActual
- Match 1..\* MatchInviteToken

## Rules & Constraints

- One AttendanceIntent per (matchId, playerId); latest wins for status view
- guestCount ≥ 0; match totals include guests (totalConfirmed = confirmedPlayers + sum(guestCount))
- fieldCost default: 600000 if null
- Readiness check at 18:00 uses type thresholds (Internal: ≥14; VsTeam: ≥7)
- Device recognition is not persisted in DB (cookie/local storage); unknown devices require approval
