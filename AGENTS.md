# Fizzy

This file provides guidance to AI coding agents working with this repository.

## What is Fizzy?

Fizzy is a collaborative project management and issue tracking application built by 37signals/Basecamp. It's a kanban-style tool for teams to create and manage cards (tasks/issues) across boards, organize work into columns representing workflow stages, and collaborate via comments, mentions, and assignments.

## Development Commands

### Setup and Server
```bash
bin/setup              # Initial setup (installs gems, creates DB, loads schema)
bin/dev                # Start development server (runs on port 3006)
```

Development URL: http://app.fizzy.localhost:3006
Login: enter `david@example.com` (development fixtures); the passwordless verification code is printed to the **browser** JavaScript console.

### Testing
```bash
bin/rails test                    # Run unit tests (fast)
bin/rails test test/path/file_test.rb  # Run single test file
bin/rails test:system             # Run system tests (Capybara + Selenium)
bin/ci                            # Run full CI suite (style, security, tests)

# For parallel test execution issues, use:
PARALLEL_WORKERS=1 bin/rails test
```

CI pipeline (`bin/ci`) runs:
1. Rubocop (style)
2. Bundler audit (gem security)
3. Importmap audit
4. Brakeman (security scan)
5. Application tests
6. System tests

### Database
```bash
bin/rails db:fixtures:load   # Load fixture data
bin/rails db:migrate          # Run migrations
bin/rails db:reset            # Drop, create, and load schema
```

### Other Utilities
```bash
bin/rails dev:email          # Toggle letter_opener for email preview
bin/rails search:reindex     # Rebuild the sharded full-text search index
bin/rails saas:enable        # Enable SaaS mode (touches tmp/saas.txt)
bin/rails saas:disable       # Back to OSS mode
bin/jobs                     # Manage Solid Queue jobs
bin/kamal deploy             # Deploy (requires 1Password CLI for secrets)
```

Custom rake tasks live in `lib/tasks/` (`dev.rake`, `saas.rake`, `search.rake`).

## Deploy

Default branch: `main`
Pre-deploy: `bin/rails saas:enable` (use `bin/rails saas:disable` to revert locally)
Deploy: `bin/kamal deploy -d <destination>`
Destinations: production, staging, beta, beta1, beta2, beta3, beta4
Note: `beta` is a template requiring `BETA_NUMBER` env var; typical targets are `beta1`-`beta4`.

## Architecture Overview

### Multi-Tenancy (URL-Based)

Fizzy uses **URL path-based multi-tenancy**:
- Each Account (tenant) has a unique `external_account_id` (7+ digits)
- URLs are prefixed: `/{account_id}/boards/...`
- Middleware (`AccountSlug::Extractor`) extracts the account ID from the URL and sets `Current.account`
- The slug is moved from `PATH_INFO` to `SCRIPT_NAME`, making Rails think it's "mounted" at that path
- All models include `account_id` for data isolation
- Background jobs automatically serialize and restore account context

**Key insight**: This architecture allows multi-tenancy without subdomains or separate databases, making local development and testing simpler.

### Authentication & Authorization

**Passwordless magic link authentication**:
- Global `Identity` (email-based) can have `Users` in multiple Accounts
- Users belong to an Account and have roles: owner, admin, member, system
- Sessions managed via signed cookies
- Board-level access control via `Access` records

### Core Domain Models

**Account** → The tenant/organization
- Has users, boards, cards, tags, webhooks
- Has entropy configuration for auto-postponement

**Identity** → Global user (email)
- Can have Users in multiple Accounts
- Session management tied to Identity

**User** → Account membership
- Belongs to Account and Identity
- Has role (owner/admin/member/system)
- Board access via explicit `Access` records

**Board** → Primary organizational unit
- Has columns for workflow stages
- Can be "all access" or selective
- Can be published publicly with shareable key

**Card** → Main work item (task/issue)
- Sequential number within each Account
- Rich text description and attachments
- Lifecycle: triage → columns → closed/not_now
- Automatically postpones after inactivity ("entropy")

**Event** → Records all significant actions
- Polymorphic association to changed object
- Drives activity timeline, notifications, webhooks
- Has JSON `particulars` for action-specific data

### Entropy System

Cards automatically "postpone" (move to "not now") after inactivity:
- Account-level default entropy period
- Board-level entropy override
- Prevents endless todo lists from accumulating
- Configurable via Account/Board settings

### UUID Primary Keys

All tables use UUIDs (UUIDv7 format, base36-encoded as 25-char strings):
- Custom fixture UUID generation maintains deterministic ordering for tests
- Fixtures are always "older" than runtime records
- `.first`/`.last` work correctly in tests

### Background Jobs (Solid Queue)

Database-backed job queue (no Redis):
- Custom `FizzyActiveJobExtensions` prepended to ActiveJob
- Jobs automatically capture/restore `Current.account`
- Mission Control::Jobs for monitoring

Key recurring tasks (via `config/recurring.yml`):
- Deliver bundled notifications (every 30 min)
- Auto-postpone stale cards (hourly)
- Cleanup jobs for expired links, deliveries

### Sharded Full-Text Search

16-shard MySQL full-text search instead of Elasticsearch:
- Shards determined by account ID hash (CRC32)
- Search records denormalized for performance
- Models in `app/models/search/`

### SaaS engine

The sibling `saas/` directory is a separate Rails engine (`fizzy-saas`, with its own `app/`, `config/`, `db/`, and `test/`) that links Fizzy to 37signals' billing and production setup. It's shipped as a gem pinned via `Gemfile.saas` / `Gemfile.saas.lock`. SaaS-only features are gated at runtime by `Fizzy.saas?` (see `lib/fizzy.rb`), which checks the `SAAS` env var or the presence of `tmp/saas.txt` (toggled by `bin/rails saas:enable` / `saas:disable`). OSS-safe code lives in the top-level Rails app; code that depends on 37signals' private infrastructure (Stripe, push notifications, production billing) belongs in `saas/`.

### Imports and exports

Allow people to move between OSS and SAAS Fizzy instances:
- Exports/Imports can be written to/read from local or S3 storage depending on the config of the instance (both must be supported)
- Must be able to handle very large ZIP files (500+GB)
- Models in `app/models/account/data_transfer/`, `app/models/zip_file`

## Tools

### Chrome MCP (Local Dev)

URL: `http://app.fizzy.localhost:3006`
Login: `david@example.com` — the verification code is printed to the browser JavaScript console on the login page.

Use Chrome MCP tools to interact with the running dev app for UI testing and debugging.

## Further reading

Longer-form docs live in `docs/`:
- `docs/development.md` — local setup, VAPID keys, MySQL adapter, email preview.
- `docs/docker-deployment.md` — run a self-hosted instance from the pre-built image.
- `docs/kamal-deployment.md` — deploy your own instance with Kamal.
- `docs/api/` — HTTP API reference.
- `saas/README.md` — internal 37signals SaaS engine (Stripe dev tunnel, beta/staging/prod environments).

## Coding style

@STYLE.md
