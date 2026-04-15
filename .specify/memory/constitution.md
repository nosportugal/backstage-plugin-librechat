<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (5 principles)
    - Technology Stack & Constraints
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no changes needed
    - .specify/templates/spec-template.md ✅ no changes needed
    - .specify/templates/tasks-template.md ✅ no changes needed
    - .specify/templates/checklist-template.md ✅ no changes needed
  Follow-up TODOs: none
-->

# Backstage Plugin LibreChat Constitution

## Core Principles

### I. Backstage Standards Compliance

- All plugin code MUST follow the official Backstage Plugin
  Development Guidelines and use the Backstage Plugin API.
- UI components MUST use Backstage core components and the
  Material UI theme provided by `@backstage/theme`.
- The plugin MUST register via `createPlugin` and expose
  routable extensions via `createRoutableExtension`.
- Backend interactions with LibreChat MUST route through the
  Backstage backend proxy to avoid CORS and credential leakage.
- Plugin configuration MUST be declared in `app-config.yaml`
  following Backstage configuration schema conventions.

**Rationale**: Backstage enforces a consistent developer and
user experience across all plugins. Deviating from standards
breaks portability, theming, and discoverability.

### II. Test-First (NON-NEGOTIABLE)

- TDD is mandatory: tests MUST be written and approved before
  implementation code exists.
- Red-Green-Refactor cycle MUST be strictly enforced for every
  user story.
- Unit tests MUST cover all React components (using
  `@testing-library/react`) and all service/utility modules.
- Integration tests MUST cover the Chat Bubble ↔ LibreChat API
  flow and the Admin Panel configuration persistence.
- No pull request MUST be merged with failing tests or
  decreased coverage below the agreed threshold.

**Rationale**: Test-first prevents regressions and ensures each
feature increment is independently verifiable from day one.

### III. TypeScript Strict Mode

- All source files MUST use TypeScript with `strict: true`
  enabled in `tsconfig.json`.
- The `any` type MUST NOT be used except at system boundaries
  (e.g., raw API responses) with an explicit type assertion and
  comment justifying the exception.
- All public APIs (props, services, utility functions) MUST have
  explicit TypeScript interfaces or type aliases.
- Backstage-provided types (`@backstage/core-plugin-api`,
  `@backstage/catalog-model`, etc.) MUST be used where
  applicable instead of custom redefinitions.

**Rationale**: Strict typing catches bugs at compile time,
improves IDE support, and makes the codebase self-documenting.

### IV. Component-Driven UI

- The Chat Bubble and Admin Panel MUST be independent,
  composable React components with clearly defined prop
  interfaces.
- Each component MUST be renderable in isolation (Storybook or
  equivalent) without requiring the full Backstage app context.
- State management MUST use React hooks and Backstage's
  `useApi` pattern; global state stores MUST NOT be introduced
  without explicit justification.
- All user-facing text MUST be externalised for future i18n
  readiness.
- Components MUST be accessible (WCAG 2.1 AA) and respect
  Backstage's light/dark theme switching.

**Rationale**: Composable, isolated components are easier to
test, maintain, and reuse across different Backstage instances.

### V. Security & Privacy by Default

- All communication with the LibreChat Agent API MUST use
  authenticated endpoints routed through Backstage's backend
  proxy.
- API tokens and secrets MUST NOT appear in client-side code,
  browser storage, or Git history.
- All user inputs (chat messages, admin config fields) MUST be
  sanitised before rendering or sending to the API.
- Admin Panel access MUST be gated by Backstage permissions
  framework; the Chat Bubble MUST respect entity ownership.
- Dependencies MUST be audited for known vulnerabilities before
  adoption and on a recurring schedule.

**Rationale**: A chat interface handling AI interactions is a
high-value target. Defence in depth at every layer reduces the
attack surface.

## Technology Stack & Constraints

- **Language**: TypeScript 5.x with strict mode
- **Frontend Framework**: React 18+ with Backstage core
  components
- **Backstage Version**: Compatible with Backstage 1.x (latest
  stable)
- **Build System**: Backstage CLI (`@backstage/cli`) for build,
  test, and lint
- **Testing**: Jest + React Testing Library for unit/integration
  tests
- **Styling**: Material UI v5 via `@backstage/theme`; no
  additional CSS-in-JS libraries unless justified
- **API Integration**: LibreChat Agent API via Backstage backend
  proxy plugin
- **Package Manager**: yarn (Backstage default)
- **Node.js**: Version aligned with Backstage requirements
  (currently 18+)

## Development Workflow

- Every feature MUST start with a specification (`spec.md`)
  before any code is written.
- Implementation follows the Spec Kit flow: specify → clarify →
  plan → tasks → implement.
- All code changes MUST be submitted via pull request with at
  least one reviewer approval.
- PR descriptions MUST reference the feature spec and list
  acceptance criteria covered.
- Linting (`eslint`) and formatting (`prettier`) MUST pass in
  CI before merge.
- The `main` branch MUST always be in a deployable state.
- Semantic versioning (MAJOR.MINOR.PATCH) MUST be used for
  plugin releases following Backstage conventions.

## Governance

- This constitution supersedes all other development practices
  for this project. In case of conflict, the constitution wins.
- Amendments require: (1) a documented rationale, (2) review by
  at least one maintainer, and (3) a version bump following
  semantic versioning:
  - MAJOR: principle removals or backward-incompatible
    governance changes
  - MINOR: new principles, sections, or material expansions
  - PATCH: clarifications, typos, non-semantic refinements
- Compliance MUST be verified during code review; reviewers
  MUST check adherence to the five core principles.
- All deviations MUST be documented with justification in the
  relevant spec or plan file.

**Version**: 1.0.0 | **Ratified**: 2025-04-15 | **Last Amended**: 2025-04-15
