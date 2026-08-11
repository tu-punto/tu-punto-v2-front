# E2E Staging Workflow Design

Date: 2026-08-11
Project: `tu-punto-v2-front`
Branch target: `staging`
Primary audience: non-technical internal users running UI automation from GitHub Actions

## Objective

Provide a simple, repeatable way for non-technical teammates to trigger Playwright end-to-end tests against the deployed staging environment from GitHub Actions without needing local code, terminal access, or project setup.

## Scope

This design covers:

- a manual GitHub Actions workflow for staging
- execution on GitHub-hosted runners
- support for selecting a module and execution mode
- artifact publication for Playwright reports and evidence
- initial integration with the existing `stock` Playwright suite

This design does not cover:

- production execution
- self-hosted runners
- Slack/Teams notifications
- auth beyond GitHub repository access
- non-Playwright testing frameworks

## User Experience

Internal users should be able to:

1. open the repository `Actions` tab
2. choose a workflow named `E2E Staging`
3. select:
   - `module`
   - `mode`
4. run the workflow on branch `staging`
5. wait for completion
6. download or open the generated Playwright report

They should not need:

- local Node.js
- the repository cloned
- editor or terminal access
- knowledge of Playwright commands

## Recommended Architecture

### Chosen approach

Use one manual workflow plus npm scripts per module/mode combination.

Workflow responsibilities:

- receive `workflow_dispatch` inputs
- install dependencies
- install Playwright browser dependencies
- expose staging secrets as environment variables
- select the proper npm script from `module` and `mode`
- upload artifacts

`package.json` responsibilities:

- define runnable entry points such as:
  - `test:e2e:stock:safe`
  - `test:e2e:stock:full`

### Why this approach

- keeps the workflow file readable
- avoids embedding large conditional command logic in YAML
- scales cleanly when new modules are added
- lets local and CI execution share the same commands

## Alternatives Considered

### Alternative A: One workflow per module

Pros:
- very explicit for users

Cons:
- duplicates logic
- does not scale well as more screens are added

### Alternative B: One workflow with inline shell branching

Pros:
- no extra scripts needed

Cons:
- YAML becomes harder to maintain
- less clear command ownership

### Alternative C: One workflow plus a custom Node router script

Pros:
- highly flexible

Cons:
- unnecessary complexity for current scope

## Workflow Contract

Workflow name:

- `E2E Staging`

Trigger:

- `workflow_dispatch`

Inputs:

- `module`
  - initial allowed value: `stock`
- `mode`
  - allowed values:
    - `safe`
    - `full`

Runner:

- `ubuntu-latest`

Branch expectation:

- intended to be run from branch `staging`

## Environment and Secrets

The workflow should read these repository or environment secrets:

- `PW_ADMIN_EMAIL`
- `PW_ADMIN_PASSWORD`
- `PW_BRANCH_NAME`
- `PLAYWRIGHT_BASE_URL`

These should point to the deployed staging system, not localhost.

## Script Strategy

Initial script set:

- `test:e2e:stock:safe`
- `test:e2e:stock:full`

Future extension examples:

- `test:e2e:shipping:safe`
- `test:e2e:shipping:full`
- `test:e2e:sales:safe`
- `test:e2e:sales:full`

This creates a consistent naming convention and keeps the workflow generic.

## Safe vs Full

### Safe mode

Should run only non-destructive tests, such as:

- access
- initial load
- seller selection
- search
- filters
- pagination

### Full mode

Should run the complete module suite, including destructive or data-changing flows, such as:

- product creation
- stock update

## Test Organization Requirement

To support `safe` and `full`, the stock suite must expose a stable selection mechanism. The preferred approach is:

- mark destructive tests with a Playwright tag or grep pattern
- let:
  - `safe` exclude destructive tests
  - `full` include all tests

This avoids duplicating spec files.

## Artifact Output

The workflow should always upload:

- `playwright-report`
- `test-results`

This ensures users can review:

- pass/fail summary
- screenshots
- videos
- traces

## Failure Handling

Expected failure modes:

- invalid staging credentials
- unavailable staging frontend or backend
- dataset drift in staging
- flaky selectors or timing issues

Workflow behavior:

- fail the run clearly
- still upload artifacts even when tests fail

## Rollout Plan

### Phase 1

- add staging workflow
- add stock safe/full scripts
- verify artifact generation

### Phase 2

- refine destructive tagging
- add more modules
- optionally add notifications or summary outputs

## Success Criteria

The workflow is successful when:

- a non-technical user can manually trigger it from GitHub Actions
- it runs against the deployed staging environment
- it supports `module=stock`
- it supports `mode=safe` and `mode=full`
- it uploads a Playwright report and evidence artifacts

## Implementation Notes

- the workflow should favor `npm ci`
- Playwright browser install should use Chromium only unless other browsers are required later
- the workflow should remain generic and not hardcode `stock` logic beyond initial script mapping
- future module additions should require only:
  - new npm scripts
  - new test selection rules
  - one extra `module` option
