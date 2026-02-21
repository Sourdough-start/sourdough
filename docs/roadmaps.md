# Roadmaps & Plans

Development roadmaps and implementation history.

## Active Development

Currently in progress. Complete these before starting new work.

_No items. Documentation Audit complete._

## Next Up

Ready to start. These are unblocked and can begin immediately.

_No items._

## Planned Features

Requires foundation work or longer-term planning.

- **[Stripe Connect Integration](plans/stripe-connect-roadmap.md)** - Stripe Connect with 1% application fee for platform monetization. Includes payment service layer, webhook handling, Connect onboarding for forks, settings UI, payment history, usage tracking integration, dual licensing (MIT core + commercial Stripe module), and comprehensive developer recipes/patterns. 10 phases (Phase 0 is manual platform setup).

## Pre-Release Checklist

After completing Planned Features, complete these final tasks before release:

- [x] **Documentation Architecture Review** - Fix cross-document inconsistencies, add architectural clarity, improve developer experience docs (see [Documentation Architecture Review](plans/documentation-architecture-review-roadmap.md)) — completed 2026-02-05
- [x] **Final Code Review** - Review all modified files for bugs, debug code, hardcoded values, and adherence to patterns (see [Code Review recipe](ai/recipes/code-review.md)) — completed 2026-02-14
- [x] **Roadmap Cleanup** - Archive completed roadmaps, verify all links work, update stale entries (see Roadmap Maintenance below) — completed 2026-02-14
- [x] **User Build Verification** - Manually verify the Docker build works end-to-end (see Build Verification below) — completed 2026-02-15

## Completed (Core Done)

High-priority work complete. Only optional/lower-priority items remain.

| Roadmap | Completed | Remaining Work |
|---------|-----------|----------------|
| Integration Usage Dashboard | 2026-02-14 | Optional: additional LLM pricing presets, broadcasting instrumentation via event listener |
| [Changelog Page](plans/changelog-roadmap.md) | 2026-02-14 | Optional: Phase 4 (auto-generate from GitHub releases, "What's New" modal) |
| UI Issues: Toggles & Theme Adherence | 2026-02-14 | Manual testing recommended during build verification |
| [In-App Documentation & Onboarding](plans/in-app-documentation-roadmap.md) | 2026-02-05 | Optional: additional help articles, advanced onboarding flows |
| [Progressive Web App (PWA)](plans/pwa-roadmap.md) | 2026-01-31 | Optional: periodic sync, protocol handlers, rich notifications |
| [Storage Settings Enhancement](plans/storage-settings-roadmap.md) | 2026-01-31 | Optional: usage-over-time chart, orphaned/duplicate file detection |
| [Web Push Notifications](plans/web-push-notifications-roadmap.md) | 2026-01-31 | Merged into PWA roadmap; core complete |
| [Auth UI Redesign](plans/auth-ui-redesign-roadmap.md) | 2026-01-29 | Optional: illustrations, page transitions |
| [Logging](plans/logging-roadmap.md) | 2026-01-29 | Optional: archival, aggregation, scheduled export |
| [Audit Logs & Logging](plans/audit-logs-roadmap.md) | 2026-01-29 | Optional: external storage, aggregation |
| [LLM Model Discovery](plans/llm-model-discovery-roadmap.md) | 2026-01-29 | Optional: troubleshooting E2E, additional regions for Bedrock |
| [Notifications](plans/notifications-roadmap.md) | 2026-01-27 | Optional: user docs |
| Notification Refactor to Novu | 2026-02-07 | Optional Novu (Cloud/self-hosted); local system remains fallback. [ADR-025](adr/025-novu-notification-integration.md), [configure-novu](ai/recipes/configure-novu.md) |
| [Versioning System](plans/versioning-system-roadmap.md) | 2026-01-30 | Optional: Phase 4 (version check, update notification) |
| [Mobile Responsiveness](plans/mobile-responsive-roadmap.md) | 2026-01-27 | Optional: QA/testing items |
| [SSO Settings Enhancement](plans/sso-settings-enhancement-roadmap.md) | 2026-01-30 | Optional: Phase 4 branded logos, Phase 9 screenshots |
| [Admin Features](plans/admin-features-roadmap.md) | 2026-01-30 | Optional: Per-type notification templates, notification digest settings |

## Completed (Fully Done)

All tasks complete.

| Roadmap | Completed |
|---------|-----------|
| [Documentation Audit](plans/documentation-audit-roadmap.md) | 2026-01-31 |
| [Configurable Auth Features](plans/configurable-auth-features-roadmap.md) | 2026-01-30 |
| [Dashboard Improvements](plans/dashboard-improvements-roadmap.md) | 2026-01-30 |
| [User Groups](plans/user-groups-roadmap.md) | 2026-01-30 |
| [Meilisearch Integration](plans/meilisearch-integration-roadmap.md) | 2026-01-30 |
| [Meilisearch Configuration](plans/meilisearch-configuration-roadmap.md) | 2026-01-30 |
| [Integration Settings](plans/integration-settings-roadmap.md) | 2026-01-29 |
| [Email Configuration Dependencies](plans/email-configuration-dependencies-roadmap.md) | 2026-01-29 |
| [Env to Database Migration](plans/env-to-database-roadmap.md) | 2026-01-29 |
| [Global Components Audit](plans/global-components-audit-roadmap.md) | 2026-01-28 |
| [Branding & UI Consistency](plans/branding-ui-consistency-roadmap.md) | 2026-01-27 |
| [Settings Restructure](plans/settings-restructure-roadmap.md) | 2026-01-27 |
| [Critical Fixes](plans/critical-fixes-roadmap.md) | 2026-01-27 |
| [shadcn/ui CLI Setup](plans/shadcn-cli-setup-roadmap.md) | 2026-01-27 |
| [Configuration Navigation Redesign](plans/config-navigation-redesign-roadmap.md) | 2026-01-29 |
| [Collapsible Settings UI](plans/collapsible-settings-ui-roadmap.md) | 2026-01-29 |
| [Branded Iconography](plans/branded-iconography-roadmap.md) | 2026-01-29 |
| [Docker Container Audit](plans/docker-audit-roadmap.md) | 2026-02-05 |
| [Security Compliance Review](plans/security-compliance-roadmap.md) | 2026-02-05 |
| Page Title Fixing | 2026-02-04 |
| PWA Review | 2026-02-05 |
| PWA Hardening | 2026-02-05 |
| Login Testing & Review | 2026-02-05 |
| GitHub Actions Hardening | 2026-02-05 |
| Documentation Restructure | 2026-02-05 |
| PWA: Configuration navigation on mobile | 2026-02-06 |
| Faster Sign Out | 2026-02-06 |

## Integration Costs

Reference for paid third-party integrations used by Sourdough. All integrations are optional — the app runs fully self-hosted with no paid services required. Costs only apply when an admin configures and enables a paid provider.

### LLM Providers (per-token/per-request)

| Provider | Pricing Model | Notes |
|----------|--------------|-------|
| OpenAI (GPT-4, GPT-4o) | Per input/output token | Varies by model; GPT-4o is cheaper than GPT-4 |
| Anthropic (Claude) | Per input/output token | Varies by model tier (Haiku, Sonnet, Opus) |
| Google Gemini | Per input/output token | Free tier available; paid for higher usage |
| AWS Bedrock | Per input/output token | Pay-per-use via AWS account; model pricing varies |
| Azure OpenAI | Per input/output token | Azure subscription required; same models as OpenAI |
| Ollama (local) | Free (self-hosted) | Runs on local hardware; no API costs |

**Cost amplifiers:** Aggregation mode queries all configured providers (multiplied cost); Council mode queries all providers plus a synthesis step. Single mode is the most cost-efficient.

### Email Providers (per message)

| Provider | Pricing Model | Notes |
|----------|--------------|-------|
| SMTP (self-hosted) | Free | Requires own mail server |
| Mailgun | Per email (free tier available) | 100 emails/day free, then per-email |
| SendGrid | Per email (free tier available) | 100 emails/day free, then tiered plans |
| AWS SES | Per email | ~$0.10/1,000 emails; very cost-effective at scale |
| Postmark | Per email | Transactional-focused; tiered plans |

### SMS Providers (per message)

| Provider | Pricing Model | Notes |
|----------|--------------|-------|
| Twilio | Per SMS segment | Pricing varies by country; ~$0.0079/msg (US) |
| Vonage | Per SMS segment | Pricing varies by country |
| AWS SNS | Per SMS | ~$0.00645/msg (US); international rates vary |

### Storage Providers (per GB/month)

| Provider | Pricing Model | Notes |
|----------|--------------|-------|
| Local disk | Free | Default; limited by server disk |
| Amazon S3 | Per GB stored + requests | ~$0.023/GB/month (Standard) |
| Google Cloud Storage | Per GB stored + requests | ~$0.020/GB/month (Standard) |
| Azure Blob Storage | Per GB stored + requests | ~$0.018/GB/month (Hot tier) |
| DigitalOcean Spaces | Flat + per GB | $5/month includes 250 GB |
| MinIO (self-hosted) | Free | S3-compatible; runs on own infrastructure |
| Backblaze B2 | Per GB stored + requests | ~$0.006/GB/month; 10 GB free |

### Real-Time / Broadcasting

| Provider | Pricing Model | Notes |
|----------|--------------|-------|
| Pusher | Per connection + messages | Free tier: 200k messages/day, 100 connections. Required only for live streaming features (audit logs, app logs) |

### Notification Services (optional)

| Provider | Pricing Model | Notes |
|----------|--------------|-------|
| Novu (optional) | Free tier + usage-based | Optional notification infrastructure (Cloud or self-hosted). Free for 30k events/month. Local system remains default fallback. See [ADR-025](adr/025-novu-notification-integration.md). |

### Payment Processing (per transaction)

| Provider | Pricing Model | Notes |
|----------|--------------|-------|
| Stripe | 2.9% + 30c per transaction | Plus 1% Sourdough platform fee via Connect. Optional — only when Stripe is configured. See [Stripe Connect Roadmap](plans/stripe-connect-roadmap.md). |

### Free Integrations (no cost)

These integrations are self-hosted or free and incur no third-party costs:

- **Meilisearch** — Embedded in Docker container (self-hosted)
- **Ollama** — Local LLM inference (self-hosted)
- **SSO/OAuth providers** — Google, GitHub, Microsoft, Apple, Discord, GitLab authentication is free
- **Telegram, Discord, Slack, Matrix, ntfy** — Notification channels use free APIs/webhooks
- **Web Push (VAPID)** — Browser push notifications are free
- **SMTP** — Self-hosted email is free

### Cost Management Considerations

- **LLM is typically the largest cost** — Monitor token usage; prefer Single mode over Aggregation/Council for routine queries
- **Email costs are usually negligible** — Most apps send fewer than 1,000 emails/month (well within free tiers)
- **SMS is per-message** — Can add up with international recipients; consider limiting to critical notifications only
- **Storage scales with data** — Local disk is free; cloud storage costs grow with backup frequency and file uploads
- **Broadcasting is optional** — Only needed for real-time log streaming; most deployments don't require it

### Usage Dashboard (Completed 2026-02-14)

A unified **Configuration > Usage & Costs** page for admins to visualize and monitor costs across all paid integrations. Single combined chart with date range selector and integration filters.

**Phase 1: Usage Tracking (Backend)** — Done

- [x] Create `integration_usage` table — columns: `id`, `integration`, `provider`, `metric`, `quantity`, `estimated_cost`, `metadata` (JSON), `user_id` (nullable), `created_at`
- [x] Create `IntegrationUsage` model with scopes: `byIntegration()`, `byProvider()`, `byDateRange()`, `byUser()`
- [x] Create `UsageTrackingService` — `record()` method plus convenience methods (`recordLLM`, `recordEmail`, `recordSMS`, `recordStorage`, `recordBroadcast`)
- [x] Instrument LLM calls — log tokens in/out, provider, model, and estimated cost in `LLMOrchestrator::logRequest()`. Cost estimation uses configurable per-model rates from `settings-schema.php` with default fallbacks
- [x] Instrument email sends — log per-send in `EmailChannel` with provider name
- [x] Instrument SMS sends — log per-message in `TwilioChannel`, `VonageChannel`, `SNSChannel` with provider and recipient country
- [x] Instrument storage operations — log upload/download size in `StorageService` for cloud providers only (skip local)
- [ ] Instrument broadcasting — log connection events if Pusher is configured (optional, lower priority)

**Phase 2: Usage Stats API (Backend)** — Done

- [x] Create `UsageController` — protected by `can:usage.view` permission, routes under `/api/usage`
- [x] `GET /api/usage/stats` — aggregated usage data with query params: `date_from`, `date_to`, `integration`, `provider`, `group_by`
- [x] Response shape: `{ summary: { total_estimated_cost, by_integration }, daily: [...], by_provider: [...] }`
- [x] `GET /api/usage/breakdown` — detailed breakdown for a single integration (LLM by model, per-user attribution)
- [x] Add `usage` group to `settings-schema.php` for pricing, budgets, and alert threshold

**Phase 3: Usage Dashboard (Frontend)** — Done

- [x] Add **Configuration > Usage & Costs** page at `/configuration/usage`
- [x] Add "Usage & Costs" menu item to Configuration navigation (Logs & Monitoring group) with `usage.view` permission
- [x] **Date range selector** — Two `<Input type="date">` fields plus preset buttons (Last 7/30/90 days, This month, Last month)
- [x] **Summary stat cards** — Reusing `AuditStatsCard` pattern: Total Cost, LLM, Email, SMS, Storage, Broadcasting
- [x] **Combined cost chart** — Recharts stacked `AreaChart` with `ChartContainer`, `ChartTooltip`, `ChartLegend`
- [x] **Integration filter** — Toggle buttons to show/hide integration types on chart and stat cards
- [x] **Provider breakdown table** — Sortable table: Provider, Integration, Total Units, Est. Cost, with totals row
- [x] **Empty state** — Message explaining usage tracking begins once paid integrations are used

**Phase 4: Cost Alerts & Export** — Done

- [x] **Cost alerts** — Configurable monthly budget per integration; `UsageAlertService` + `CheckUsageBudgetsCommand` (daily schedule) notify admins at threshold and 100%
- [x] **CSV export** — `GET /api/usage/export` streams CSV with chunked queries (protected by `can:logs.export`)
- [x] **Per-user breakdown** — `GET /api/usage/breakdown` includes per-user cost attribution for LLM and SMS
- [x] **Dashboard widget** — `UsageDashboardWidget` on admin dashboard showing current month total + mini sparkline trend

**Optional remaining work:**
- [ ] Additional LLM pricing presets for newer models (e.g. Claude 4, GPT-5)
- [ ] Broadcasting instrumentation via Pusher event listener (low priority, most deployments don't use broadcasting)
- [ ] Provider filter dropdown on the Usage page (currently filters by integration toggle only, not individual provider)

## Roadmap Maintenance

When adding or updating roadmaps:

1. **New roadmaps**: Add to appropriate section (Active, Next Up, or Planned) with priority
2. **Completing work**: Move to Completed section with date, note any remaining optional work
3. **Verify links**: Ensure all roadmap file links resolve correctly
4. **Journal entries**: Add implementation notes to the Journal Entries table

## Build Verification

To verify the build works end-to-end:

1. Clean rebuild: `docker-compose down -v && docker-compose up -d --build`
2. Wait for startup, then access http://localhost:8080
3. Test: login flow, dashboard loads, configuration pages work
4. Check browser console for errors

**Production build verified 2026-02-15**: Docker build, registration, login, dashboard, configuration pages all working. Production standalone mode is clean.

**Known dev-mode issues** (do not affect production):
- The dev compose (`docker-compose.yml`) runs Next.js in Turbopack dev mode. After a `down -v` (which deletes the `node_modules` volume), the `start-nextjs.sh` script auto-installs dependencies but Turbopack may produce stale module chunks for `lib/utils.ts` (e.g. `formatCurrency is not a function`). Workaround: restart the container once after the initial `npm install` completes, or test with a production container (`docker run` without source mounts).
- Hydration mismatch warning (debug level) from Sonner Toaster's deferred client-side mount — cosmetic only, does not crash production builds.

## Journal Entries

Implementation history and development notes in `journal/`:

| Date | Entry |
|------|-------|
| 2026-02-14 | [Documentation & Architecture Review](journal/2026-02-14-documentation-architecture-review.md) |
| 2026-02-14 | [Integration Usage Dashboard](journal/2026-02-14-integration-usage-dashboard.md) |
| 2026-02-14 | [Changelog Page & Theme Adherence Fixes](journal/2026-02-14-changelog-and-theme-fixes.md) |
| 2026-02-06 | [Faster Sign Out](journal/2026-02-06-faster-sign-out.md) |
| 2026-02-05 | [Documentation Restructure](journal/2026-02-05-documentation-restructure.md) |
| 2026-02-05 | [Frontend Code Review](journal/2026-02-05-frontend-code-review.md) |
| 2026-02-05 | [Code Review Phase 2: Backend Architecture, Database, Response Format](journal/2026-02-05-code-review-phase-2.md) |
| 2026-02-05 | [In-App Documentation Completion](journal/2026-02-05-in-app-docs-completion.md) |
| 2026-02-05 | [Wizard and Help Center Styling Fixes](journal/2026-02-05-wizard-help-center-styling-fixes.md) |
| 2026-02-05 | [Meilisearch Production Permission Denied Fix](journal/2026-02-05-meilisearch-production-permissions.md) |
| 2026-02-05 | [Cache Permissions Fix](journal/2026-02-05-cache-permissions-fix.md) |
| 2026-02-05 | [SSO Test Connection Toggle Fix](journal/2026-02-05-sso-test-toggle-fix.md) |
| 2026-02-05 | [Phase 1: Security and Authentication Code Review](journal/2026-02-05-phase-1-security-review.md) |
| 2026-02-05 | [Page Titles App Name Fix](journal/2026-02-05-page-titles-app-name-fix.md) |
| 2026-02-05 | [Docker Build Optimization & Security Updates](journal/2026-02-05-docker-optimization-and-security-updates.md) |
| 2026-02-05 | [In-App Documentation & Onboarding (Phases 1-3)](journal/2026-02-05-in-app-documentation-phases-1-3.md) |
| 2026-02-05 | [Security Compliance Documentation Completion](journal/2026-02-05-security-compliance-documentation-completion.md) |
| 2026-02-05 | [Compliance Templates](journal/2026-02-05-compliance-templates.md) |
| 2026-02-05 | [Docker Container Audit](journal/2026-02-05-docker-container-audit.md) |
| 2026-02-05 | [Login Testing & Review](journal/2026-02-05-login-testing-review.md) |
| 2026-02-05 | [PWA Hardening](journal/2026-02-05-pwa-hardening.md) |
| 2026-02-05 | [PWA Review and Code Audit](journal/2026-02-05-pwa-review.md) |
| 2026-02-05 | [GitHub Actions Hardening](journal/2026-02-05-github-actions-hardening.md) |
| 2026-02-05 | [Migration Service Container Fix](journal/2026-02-05-migration-service-container-fix.md) |
| 2026-02-04 | [Security Page Architecture Cleanup](journal/2026-02-04-security-page-cleanup.md) |
| 2026-02-02 | [Security SAST Automation](journal/2026-02-02-security-sast-automation.md) |
| 2026-02-02 | [Security Review Phase 1: Security Headers & CORS Hardening](journal/2026-02-02-security-review-phase-1.md) |
| 2026-01-31 | [Documentation Audit Phase 8: Cross-Reference & Completeness](journal/2026-01-31-documentation-audit-phase-8.md) |
| 2026-01-31 | [Documentation Audit Phase 4: ADR & Architecture](journal/2026-01-31-documentation-audit-phase-4-adr.md) |
| 2026-01-31 | [Documentation Audit Phase 3: Patterns & Anti-Patterns](journal/2026-01-31-documentation-audit-phase-3.md) |
| 2026-01-31 | [Documentation Audit Phase 2: AI Recipes](journal/2026-01-31-documentation-audit-phase-2.md) |
| 2026-01-31 | [Documentation Audit Phase 1: Cursor Rules](journal/2026-01-31-documentation-audit-phase-1.md) |
| 2026-01-31 | [PWA Phase 4 and 5: Install Experience and Advanced Features](journal/2026-01-31-pwa-phase-4-5-install-and-advanced.md) |
| 2026-01-31 | [PWA Phase 3: Offline Experience](journal/2026-01-31-pwa-phase-3-offline-experience.md) |
| 2026-01-31 | [PWA Phase 2: Push Notifications](journal/2026-01-31-pwa-push-notifications.md) |
| 2026-01-30 | [Notification Templates Implementation](journal/2026-01-30-notification-templates.md) |
| 2026-01-30 | [Meilisearch Embedded in Container](journal/2026-01-30-meilisearch-embedded.md) |
| 2026-01-30 | [Remove is_admin, Admin Group Only](journal/2026-01-30-remove-is-admin-group-only.md) |
| 2026-01-30 | [Meilisearch Configuration](journal/2026-01-30-meilisearch-configuration.md) |
| 2026-01-30 | [Dashboard Static Simplification](journal/2026-01-30-dashboard-static-simplification.md) |
| 2026-01-30 | [Alpine to Debian Migration for Meilisearch](journal/2026-01-30-alpine-to-debian-meilisearch.md) |
| 2026-01-30 | [User Groups Phase 4: Admin UI](journal/2026-01-30-user-groups-phase-4-admin-ui.md) |
| 2026-01-30 | [Search documentation update](journal/2026-01-30-search-documentation-update.md) |
| 2026-01-30 | [Meilisearch Integration (Phases 4–6)](journal/2026-01-30-meilisearch-phases-4-6.md) |
| 2026-01-30 | [Meilisearch Integration (Phases 1–3)](journal/2026-01-30-meilisearch-phases-1-3.md) |
| 2026-01-30 | [Configurable Auth Features](journal/2026-01-30-configurable-auth-features.md) |
| 2026-01-30 | [Storage Phase 4: Analytics & Monitoring](journal/2026-01-30-storage-phase-4-analytics.md) |
| 2026-01-30 | [Storage Settings Phase 2 (Additional Providers)](journal/2026-01-30-storage-providers-phase-2.md) |
| 2026-01-30 | [Storage Settings Phase 1 (Local Storage Transparency)](journal/2026-01-30-storage-settings-phase-1.md) |
| 2026-01-30 | [SSO Settings Enhancement](journal/2026-01-30-sso-settings-enhancement.md) |
| 2026-01-29 | [Configuration Navigation Redesign](journal/2026-01-29-config-nav-redesign.md) |
| 2026-01-29 | [Scheduled Tasks/Jobs UI (Run Now & History)](journal/2026-01-29-scheduled-jobs-ui.md) |
| 2026-01-29 | [Live Console Logs & HIPAA Access Logging](journal/2026-01-29-live-logs-hipaa-logging.md) |
| 2026-01-29 | [Access Logs Field Tracking](journal/2026-01-29-access-logs-field-tracking.md) |
| 2026-01-29 | [HIPAA Access Logging Toggle](journal/2026-01-29-hipaa-logging-toggle.md) |
| 2026-01-29 | [Console and Application Logging](journal/2026-01-29-console-app-logging.md) |
| 2026-01-29 | [Audit Dashboard Analytics (Phase 2)](journal/2026-01-29-audit-dashboard-analytics.md) |
| 2026-01-29 | [Audit Extended Features (Real-time Streaming & Structured Logging)](journal/2026-01-29-audit-extended-features.md) |
| 2026-01-29 | [Audit Logging Implementation](journal/2026-01-29-audit-logging-implementation.md) |
| 2026-01-29 | [LLM Settings Page Consolidation](journal/2026-01-29-llm-settings-consolidation.md) |
| 2026-01-29 | [LLM Model Discovery](journal/2026-01-29-llm-model-discovery.md) |
| 2026-01-29 | [User Management Admin (HIGH Priority)](journal/2026-01-29-user-management-admin.md) |
| 2026-01-29 | [Email Template Integration (Chunk D)](journal/2026-01-29-email-template-integration-chunk-d.md) |
| 2026-01-29 | [Email Template Infrastructure (Chunk B)](journal/2026-01-29-email-template-infrastructure.md) |
| 2026-01-29 | [Backup Settings Migration (Env to DB Phase 6)](journal/2026-01-29-backup-settings-migration.md) |
| 2026-01-28 | [SSO Settings Migration (Env to DB Phase 5)](journal/2026-01-28-sso-settings-migration.md) |
| 2026-01-28 | [Notification & LLM Settings Migration (Env to DB Phase 3–4)](journal/2026-01-28-notification-llm-settings-migration.md) |
| 2026-01-28 | [SettingService Implementation (Env to DB Phase 1–2)](journal/2026-01-28-setting-service-implementation.md) |
| 2026-01-28 | [Notification Config Split (Global vs Per-User)](journal/2026-01-28-notification-config-split.md) |
| 2026-01-27 | [Notifications Implementation](journal/2026-01-27-notifications-implementation.md) |
| 2026-01-27 | [Mobile Responsiveness Implementation](journal/2026-01-27-mobile-responsiveness-implementation.md) |
| 2026-01-27 | [shadcn/ui CLI Migration](journal/2026-01-27-shadcn-cli-migration.md) |
| 2026-01-26 | [AI Documentation Optimization](journal/2026-01-26-ai-documentation-optimization.md) |
| 2026-01-26 | [Docker Next.js Volume Fix](journal/2026-01-26-docker-nextjs-volume-fix.md) |
| 2026-01-26 | [Navigation Refactor](journal/2026-01-26-navigation-refactor.md) |
| 2026-01-26 | [Section 2 Settings Implementation](journal/2026-01-26-section-2-settings-implementation.md) |
| 2026-01-26 | [Documentation Restructure](journal/2026-01-26-documentation-restructure.md) |
