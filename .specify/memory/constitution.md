<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0
- Modified principles: None
- Added sections:
  - VI. Development Environment Respect (new principle)
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (no changes needed)
  - ✅ .specify/templates/spec-template.md (no changes needed)
  - ✅ .specify/templates/tasks-template.md (no changes needed)
  - ⚠ .specify/templates/commands/ (directory not present; no action)
- Follow-up TODOs: None
-->

# FKAS Constitution

## Core Principles

### I. Code Quality Is a Gate (Non‑Negotiable)

All contributions MUST meet objective quality gates before merge:

- Lint and format clean with project defaults.
- All code changes MUST pass TypeScript typecheck (`tsc --noEmit`) and lint (`eslint`) before commit/merge.
- For this small project, automated unit tests are OPTIONAL.
- Provide a concise manual verification checklist and a scripted smoke test that covers the primary path.
- No P1/P2 static analysis issues or security findings in changed scope.
- Clear, small PRs with rationale and user impact summary.

Rationale: High code quality reduces defects, accelerates onboarding, and protects velocity long‑term.

### II. Consistent User Experience System

User‑facing changes MUST use a shared design system and interaction patterns:

- One typography, color, spacing, and component system across the app.
- Interaction affordances, empty/error/loading states are consistent.
- Accessibility: WCAG 2.1 AA for all interactive flows.
- Copywriting follows a concise, friendly tone; microcopy patterns are reused.

Rationale: Consistency lowers cognitive load and support burden, increasing user trust and task success.

### III. Speed of Development

Optimize for fast iteration without sacrificing quality gates:

- Trunk‑based or short‑lived branches; PRs reviewed within 24 hours.
- Dev environment boots in < 5 minutes from fresh clone.
- Common tasks scripted (one‑command run, test, lint, seed, and demo).
- Favor simple, boring solutions; avoid premature abstractions.

Rationale: Short feedback loops maximize learning and throughput.

### IV. Fast, Reliable Deployment

Every change SHOULD be releasable and deployments MUST be safe:

- CI finishes in < 10 minutes on average for PRs.
- CD promotes to production via automated, observable pipelines.
- Feature flags for risky changes; instant rollback path verified.
- Release notes auto‑generated from commits/PRs.

Rationale: Frequent, safe releases reduce risk and deliver value sooner.

### V. Simple UI, Effortless to Use

Favor minimal surface area and obvious paths:

- Primary task discoverable in 1–2 clicks from entry.
- Default choices are sensible; advanced options progressively disclosed.
- Forms are short; validation is inline and descriptive.
- Performance budgets: key interactions p95 < 200ms; first meaningful paint < 2s.

Rationale: Simplicity increases completion rates and decreases support.

### VI. Development Environment Respect

Agents MUST respect the developer's active development environment:

- NEVER automatically run `npm run dev` or equivalent development servers.
- Assume the developer is already running their preferred development setup.
- Only suggest running development commands when explicitly requested or when troubleshooting requires it.
- When testing changes, use existing running instances or clearly indicate when a restart is needed.

Rationale: Developers often have custom configurations, multiple terminals, or specific development workflows that should not be disrupted by automated commands.

## Non‑Functional Standards

- Languages, frameworks, and tools MUST be widely supported and actively maintained.
- Observability: structured logs, minimal tracing on critical paths, actionable dashboards.
- Security: dependency hygiene, secrets management, least privilege for services and humans.
- Data: personal data handling documented; migrations are reversible.
- Documentation: user‑visible changes include a short usage note or screenshot.

## Development Workflow

- Every PR includes: scope summary, user impact, screenshots for UI, and rollout plan if needed.
- Quality gates from Principle I are enforced in CI; merges are blocked on failures.
- After any code generation/edit by an agent, run TS typecheck and lint; fix errors before proceeding.
- Reviews focus on correctness, simplicity, and UX consistency (Principles II & V).
- Releases are automated; manual actions are documented and minimized.
- Post‑release: monitor key metrics; rollback on user‑impacting regressions.

## Governance

This constitution supersedes informal practices. Amendments require:

- Written proposal describing change, motivation, and migration/rollout plan.
- Approval by project maintainers.
- Version bump per rules below and date update.

Versioning policy for this document:

- MAJOR (X.0.0): Backward‑incompatible removals/redefinitions of principles.
- MINOR (X.Y.0): New principle/section or materially expanded guidance.
- PATCH (X.Y.Z): Clarifications and non‑semantic edits.

Compliance:

- All PRs MUST attest compliance or explicitly document justified exceptions.
- Exceptions are time‑boxed with an owner and tracked to closure.

**Version**: 1.3.0 | **Ratified**: 2025-10-08 | **Last Amended**: 2025-01-09
