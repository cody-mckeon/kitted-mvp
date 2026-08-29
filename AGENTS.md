# Kitted MVP — Codex Project Context

## Product
Kitted is a B2C outdoor-commerce MVP designed to reduce the effort and uncertainty involved in buying outdoor gear.

The current product goal is to validate whether activity-led, explainable gear discovery improves product discovery and adventure-to-cart conversion compared with conventional browsing.

## Sprint 1 Goal
Deliver the conventional commerce foundation.

A customer should be able to move:

Homepage → discovery → product listing → product detail → cart

without using guided commerce.

## Current Sprint 1 Scope
Sprint 1 includes:

- Homepage activity discovery
- Global navigation
- Catalog search
- Product filtering and sorting
- Product detail experience
- Add to cart
- Cart item management
- Anonymous cart persistence
- Responsive desktop/mobile behavior
- Required product states and recovery paths
- Analytics instrumentation
- QA-ready behavior

## Supported Activities
The local catalog supports:

- Camping
- Hiking
- Backpacking
- Snowboarding
- Skiing
- Mountain Biking

Camping, Hiking, and Backpacking remain the primary activities for the deeper guided-commerce MVP planned later.

## Catalog
Use the existing local structured catalog and schema already committed to the repository.

Do not replace the catalog with hardcoded feature-specific product data unless required by the issue.

## Prototype Architecture
This is an MVP prototype.

Expected approach:

- Next.js
- React
- TypeScript
- local structured catalog data
- local client-side state where appropriate
- localStorage for anonymous cart persistence
- responsive UI

Prefer existing project patterns and reusable components.

## Product States
Where required by the Linear issue, account for states such as:

- default
- loading
- success
- empty
- error
- unavailable / out of stock
- missing optional data
- mobile / responsive behavior

Do not silently ignore documented failure or recovery states.

## Analytics
Implement or preserve the analytics events required by the specific Linear issue.

Sprint 1 events may include:

- homepage_viewed
- category_selected
- search_performed
- search_no_results
- filter_applied
- sort_selected
- product_viewed
- product_added_to_cart
- product_removed_from_cart
- cart_quantity_updated

Use the issue requirements as the source of truth for event properties.

## Design Handoff
UI implementation should follow the approved experience direction included in the relevant issue prompt.

Do not invent major new product interactions when the issue provides explicit behavior.

If an important UX decision is genuinely missing and prevents correct implementation, stop and flag it instead of expanding scope.

## Scope Control
Implement only the requested Linear issue unless a small shared dependency is necessary to make the issue work.

Do not proactively implement future Sprint work.

Do not add:

- production authentication
- real payment processing
- tax or shipping services
- OMS or fulfillment integrations
- production inventory services
- marketplace seller infrastructure
- production CMS/PIM infrastructure
- AI shopping assistants
- weather integrations
- WebMCP / agent commerce
- recommendation ML infrastructure

unless the specific issue explicitly requests it.

## AI Roadmap
AI is a future product enhancement, not part of the Sprint 1 conventional-commerce foundation.

The intended evolution is:

1. deterministic guided commerce
2. natural-language shopping assistance
3. contextual trip intelligence
4. agent-ready commerce capabilities

Do not introduce AI functionality into Sprint 1 unless explicitly requested.

## Working Rules
Before making changes:

1. Confirm the active repository is `cody-mckeon/kitted-mvp`.
2. Read the relevant existing code and project structure.
3. Read the supplied Linear issue requirements.
4. Keep changes limited to that issue.

Before finishing:

1. Run available tests and validation.
2. Check for obvious TypeScript/build errors.
3. Verify the documented acceptance criteria.
4. Summarize what changed.
5. Note any limitations, assumptions, or remaining issues.

## Source of Truth
For implementation priority:

1. Specific Linear issue requirements supplied in the task
2. This AGENTS.md file
3. Existing repository patterns and documentation

If these conflict, flag the conflict before making a major product decision.
