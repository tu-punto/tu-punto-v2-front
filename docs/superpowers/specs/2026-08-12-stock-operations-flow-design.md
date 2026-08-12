# Stock Operations Flow Design

## Objective

Create a new Playwright E2E flow, separate from `stock-safe` and `stock-full`, focused on executing stock operations instead of validating browsing/filter UI.

The new flow must support:

- Optional product creation at the start of the run.
- Repeated ingress operations with random valid amounts.
- Repeated egress operations with random valid amounts.
- Final verification of expected stock versus displayed stock.
- Reuse of the existing login/session helpers.
- Parameterized execution in local and GitHub Actions.

This flow is intended for operational simulation and controlled stock movement testing, not for validating search, filters, pagination, or QR management.

## Scope

In scope:

- Administrative login.
- Seller selection.
- Optional creation of one or more products.
- Operation planning and execution for ingress and egress.
- Final stock verification.
- Configurable start step.
- Configurable min/max random amount.
- Configurable operation counts.

Out of scope:

- Search/filter/pagination validation.
- QR generation, QR inventory, QR info.
- Audit, customer products, control variantes.
- Direct DB reads as primary source.

## Separation From Existing Suites

Keep the current suites with distinct purposes:

- `stock-safe`: non-destructive UI validation.
- `stock-full`: current end-to-end validation for controlled create/update flows.
- `stock-operations`: new parameterized operational runner.

This avoids overloading the current spec with mixed goals and keeps failures easier to interpret.

## Execution Model

The new flow should always log in first, then execute from a configurable functional step onward.

Logical steps:

1. `login`
2. `select-seller`
3. `create-products`
4. `ingress`
5. `egress`
6. `verify`

`startStep` does not skip authentication. It only controls which functional step begins after login/session setup.

## Inputs

The new flow should accept the following runtime inputs:

- `branchName`
- `sellerName` optional
- `createProducts` boolean
- `productCount`
- `ingressCount`
- `egressCount`
- `minAmount`
- `maxAmount`
- `startStep`

Recommended defaults:

- `createProducts=false`
- `productCount=1`
- `ingressCount=1`
- `egressCount=0`
- `minAmount=1`
- `maxAmount=5`
- `startStep=login`

Validation rules:

- `minAmount >= 1`
- `maxAmount >= minAmount`
- `productCount >= 0`
- `ingressCount >= 0`
- `egressCount >= 0`
- if `createProducts=false`, `productCount` is ignored

## Data Strategy

Primary data source should be the application/API state exposed through the UI flow, not hardcoded local fixtures.

Rules:

- Prefer discovering valid sellers/products from the current environment.
- Use UI/API-backed discovery first.
- Avoid direct DB reads unless a future blocker makes them necessary.

Behavior by mode:

- If `createProducts=true`, the runner creates products and stores them as the canonical operation targets for the rest of the run.
- If `createProducts=false`, the runner discovers existing valid products and selects the first usable targets from the selected seller context.

## Product Selection Rules

When `createProducts=false`, the flow should:

- Use the specified seller if provided.
- Otherwise discover the first seller with usable products.
- Expand the target product row when needed.
- Select concrete variants, not only base product group rows.

Usable means:

- Product/variant is visible in the current seller inventory.
- Product/variant exposes editable ingress field.
- For egress, the current stock must be greater than zero.

## Product Creation Rules

When `createProducts=true`, the flow should:

- Create `productCount` products.
- Generate unique names for each product.
- Use deterministic category/variant templates valid for the current environment.
- Save and confirm them through the existing stock confirmation modal.
- Persist the created product identities in an in-memory run state object for subsequent ingress/egress operations.

Ingress and egress must target the products created in the same run whenever creation is enabled.

## Random Operation Planning

Ingress and egress counts represent operation count, not total stock delta.

Examples:

- `ingressCount=10` means 10 separate ingress operations.
- `egressCount=4` means 4 separate egress operations.

Each operation must generate a random amount in `[minAmount, maxAmount]`.

Planning rules:

- Ingress can always use the generated amount.
- Egress must not produce negative stock.
- If the generated egress amount exceeds available stock, either:
  - reduce it to the maximum valid amount, or
  - skip that target and choose another valid target.

Recommended approach:

- Prefer adjusting to a valid amount when possible.
- Only skip when no valid positive amount can be applied.

## Run State

Maintain a per-run in-memory state object with:

- selected seller
- selected branch
- discovered target products
- created products
- initial stock snapshot
- executed ingress operations
- executed egress operations
- expected final stock by product/variant
- observed final stock by product/variant

This state becomes the source of truth for verification and reporting.

## Verification

Verification should not rely only on toast messages.

The final check should compare:

- expected stock after all operations
- visible stock rendered in the stock table for the affected product/variant rows

Required verification behaviors:

- Confirm created products are visible after creation.
- Confirm ingress operations appear in the confirmation flow and affect displayed stock.
- Confirm egress operations appear in the confirmation flow and affect displayed stock.
- Confirm final UI stock equals computed expected stock for all targeted variants.

Toast messages may be used as secondary signals, not as the primary assertion.

## Error Handling

The flow should fail with explicit messages for:

- no valid seller found
- no valid product/variant found
- no usable egress target with positive stock
- invalid runtime configuration
- product creation succeeded locally but confirmation failed
- expected stock and displayed stock mismatch

Error messages should include enough context to debug quickly:

- seller used
- product/variant used
- operation type
- requested amount
- adjusted amount if applicable

## Test Structure

Recommended implementation structure:

- New spec file dedicated to operations, for example:
  - `tests/e2e/stock-operations.spec.ts`
- New support helper module(s), for example:
  - `tests/e2e/support/stock-operations-runner.ts`
  - `tests/e2e/support/stock-operations-discovery.ts`
  - `tests/e2e/support/stock-operations-config.ts`

Keep responsibilities split:

- session/login helpers
- environment/config parsing
- target discovery
- operation planning
- operation execution
- final verification

## Local and CI Execution

The flow should support:

- local execution against localhost
- local execution against staging
- GitHub Actions execution through workflow inputs

Suggested future scripts:

- `test:e2e:stock:operations`

Suggested future workflow inputs:

- `module=stock-operations`
- `create_products`
- `product_count`
- `ingress_count`
- `egress_count`
- `min_amount`
- `max_amount`
- `start_step`
- `seller_name`

## Risks

- Environment differences between local and staging can change available sellers/products.
- UI-only discovery can become brittle if table rendering changes.
- Repeated stock operations can mutate shared environments, especially staging.

Mitigations:

- Keep `stock-operations` opt-in and parameterized.
- Prefer created products as operation targets when destructive behavior is intended.
- Use explicit run-state tracking and final verification.

## Recommendation

Implement `stock-operations` as a new, separate flow rather than extending the current stock phase 1 spec.

This keeps:

- the current validation suites stable
- operational testing configurable
- failures easier to understand
- future GitHub Actions inputs easier to expose for non-technical collaborators
