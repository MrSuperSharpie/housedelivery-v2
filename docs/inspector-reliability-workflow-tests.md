# Inspector Reliability Workflow Test Coverage

## Current test harness

The repository does not currently include a browser end-to-end test runner configuration such as Playwright or Cypress, and `package.json` does not expose an E2E script. Until that harness is added, the complete reliability workflow is covered with service-layer integration tests in `src/lib/inspectorReliabilityWorkflow.test.ts`.

## Covered scenarios

- Ideal inspection from funded job claim through commitment, confirmation ladder, arrival, Pass completion, evidence completeness, payout eligibility, and reliability improvement.
- Proper Fail completion with complete evidence, builder-safe notification status, payout eligibility, and no reliability reduction for the Fail outcome.
- Hold / Modification Required lifecycle with builder retainer acceptance, premium timer, correction evidence, final submission, premium pricing, and payout eligibility.
- Inspector no-show path with missed 4-hour and 90-minute confirmations, standby activation, original inspector removal, payout block, escrow protection, admin review, and reliability reduction.
- Valid emergency cancellation with protected classification, Admin approval, standby reassignment support, and no material reliability damage.
- Builder site-not-ready path with arrival check-in, inspector protection, configured fee hook projection, and no reliability reduction.
- Admin override from invalid to protected cancellation with neutralized reliability effect, audit-log assertion, and dashboard state refresh.
- Tier progression from Verified toward higher tiers based on repeated reliable professional work and dashboard benefits.
- Permission safety for builder, inspector, and Admin visibility boundaries across reliability detail, reserve ledger, and full job timeline.

## Remaining E2E gap

These tests do not exercise browser routing, session cookies, Supabase row-level-security policies, real notification delivery, payment-provider callbacks, device geolocation APIs, or concurrent standby-offer acceptance against a real database transaction. Those should be promoted into browser E2E and database integration coverage once an E2E harness and test Supabase environment are available.

## Flaky risk areas to isolate in future E2E

- Time-window checks around 24-hour, 4-hour, and 90-minute confirmation deadlines should use a frozen clock.
- Geofenced arrival should use deterministic mocked coordinates and avoid device/browser permission prompts.
- Notification, escrow, and payout-provider integrations should be mocked at network boundaries.
- Standby acceptance should include a real transaction or database constraint test to prevent double assignment under concurrent acceptance.
