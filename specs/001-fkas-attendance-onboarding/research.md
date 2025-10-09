# Research

## Decisions

- Next.js (App Router) + TypeScript
  - Rationale: Fast iteration, server actions, good Vercel fit, simple deployment.
  - Alternatives: Remix, SvelteKit. Rejected for familiarity and Vercel alignment.

- UI: Tailwind + shadcn/ui
  - Rationale: Modern, accessible components with minimal setup; consistent UX per constitution.
  - Alternatives: MUI, Chakra. Rejected to keep dependency weight low and style control high.

- Data: Supabase (Postgres free tier) via Prisma; SQLite locally
  - Rationale: Free managed SQL, easy Prisma support, scales beyond local SQLite.
  - Alternatives: Vercel Postgres, Neon. Supabase chosen for generous free tier and ecosystem.

- Auth (Organizer only): Admin PIN (env `ADMIN_PIN`)
  - Rationale: MVP simplicity; no accounts. Protects approvals and sensitive actions.
  - Alternatives: Email magic links, OAuth. Defer until team grows.

- Identity (Players): self‑claim + organizer approval; device cookies for returning players
  - Rationale: No login burden; low friction migration from FB comments.
  - Edge: New device/cookies cleared → re‑approval one‑tap bind.

## Open Questions (none critical)

- Payment reconciliation automation details deferred to Future Work.

## References

- FKAS Constitution v1.1.0 (quality gates, UX consistency)
