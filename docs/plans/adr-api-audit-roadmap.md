# ADR & API Documentation Audit

Systematic audit of all 30 ADRs against API documentation (`docs/api/README.md`, `docs/api/openapi.yaml`) and actual code implementation.

## Summary

- **Total ADRs audited**: 8/30
- **API doc issues found**: 9
- **Implementation gaps found**: 2
- **ADR updates needed**: 0

## How to Audit

For each ADR:
1. Read the ADR's Decision/Architecture sections
2. Cross-reference against `backend/routes/api.php` and relevant controllers/services
3. Cross-reference against `docs/api/README.md` and `docs/api/openapi.yaml`
4. Check frontend integration where ADR describes UI
5. Record findings in the table below

**Legend**: ✅ Matches | ⚠️ Partial/minor issues | ❌ Missing or significantly wrong

---

## Batch 1: Auth & Identity

| ADR | Title | Docs Accuracy | ADR Alignment | Implementation Complete | Notes |
|-----|-------|--------------|---------------|------------------------|-------|
| 002 | Authentication Architecture | ✅ | ✅ | ✅ | All endpoints, rate limiting, session auth correct |
| 003 | SSO Provider Integration | ⚠️ | ✅ | ⚠️ | 5 endpoints missing from OpenAPI. `linkedAccounts()` was unrouted — fixed |
| 004 | Two-Factor Authentication | ⚠️ | ✅ | ✅ | Recovery code endpoints missing from OpenAPI. 2FA verify schema had `recovery_code` instead of `is_recovery_code` — fixed |
| 012 | Admin-Only Settings Access | ✅ | ✅ | ✅ | All settings routes use `can:settings.view/edit` middleware |
| 015 | Env-Only Settings | ✅ | ✅ | ✅ | APP_KEY, DB_*, LOG_* correctly excluded from SettingService |
| 018 | Passkey/WebAuthn | ⚠️ | ✅ | ⚠️ | Passkey login used generic `throttle:10,1` instead of `rate.sensitive` — fixed. OpenAPI passkey ID type was integer instead of string — fixed |
| 020 | User Groups & Permissions | ✅ | ✅ | ✅ | 13 permissions, GroupService/PermissionService with caching, all routes permission-gated |
| 024 | Security Hardening | ✅ | ✅ | ✅ | SSRF, backup SQL injection, OAuth state, webhook signatures all implemented |

**Key files**: `AuthController`, `SSOController`, `TwoFactorController`, `PasskeyController`, `GroupController`, `AuthSettingController`

## Batch 2: Communication & Notifications

| ADR | Title | Docs Accuracy | ADR Alignment | Implementation Complete | Notes |
|-----|-------|--------------|---------------|------------------------|-------|
| 005 | Notification System Architecture | | | | |
| 016 | Email Template System | | | | |
| 017 | Notification Template System | | | | |
| 025 | Novu Notification Integration | | | | |
| 027 | Real-Time Streaming | | | | |

**Key files**: `NotificationController`, `EmailTemplateController`, `NotificationTemplateController`, `NovuSettingController`, `echo.ts`

## Batch 3: Data & Storage

| ADR | Title | Docs Accuracy | ADR Alignment | Implementation Complete | Notes |
|-----|-------|--------------|---------------|------------------------|-------|
| 007 | Backup System Design | | | | |
| 010 | Database Abstraction | | | | |
| 014 | Database Settings / Env Fallback | | | | |
| 021 | Search / Meilisearch | | | | |
| 022 | Storage Provider System | | | | |

**Key files**: `BackupController`, `BackupSettingController`, `SettingController`, `StorageSettingController`, `SearchService`

## Batch 4: Features & Integrations

| ADR | Title | Docs Accuracy | ADR Alignment | Implementation Complete | Notes |
|-----|-------|--------------|---------------|------------------------|-------|
| 006 | LLM Orchestration Modes | | | | |
| 026 | Stripe Connect Integration | | | | |
| 028 | Webhook System | | | | |
| 029 | Usage Tracking & Alerts | | | | |
| 030 | File Manager | | | | |

**Key files**: `LLMController`, `LLMSettingController`, `StripeConnectController`, `StripePaymentController`, `WebhookController`, `UsageController`, `FileManagerController`

## Batch 5: Infrastructure & UI

| ADR | Title | Docs Accuracy | ADR Alignment | Implementation Complete | Notes |
|-----|-------|--------------|---------------|------------------------|-------|
| 001 | Technology Stack | | | | |
| 008 | Testing Strategy | | | | |
| 009 | Docker Single-Container | | | | |
| 011 | Global Navigation Architecture | | | | |
| 013 | Responsive Mobile-First Design | | | | |
| 019 | Progressive Web App | | | | |
| 023 | Audit Logging System | | | | |

**Key files**: `docker/Dockerfile`, `docker-compose.yml`, `frontend/app/(dashboard)/`, `AuditLogController`, `sw.js`

---

## Issues Found

### API Doc Fixes Needed

**Batch 1 (Auth & Identity):**
1. ~~`POST /auth/check-email` missing from OpenAPI~~ — added
2. ~~`POST /auth/2fa/recovery-codes` missing from OpenAPI~~ — added
3. ~~`POST /auth/2fa/recovery-codes/regenerate` missing from OpenAPI~~ — added
4. ~~`POST /auth/sso/{provider}/link` missing from OpenAPI~~ — added
5. ~~`DELETE /auth/sso/{provider}/unlink` missing from OpenAPI~~ — added
6. ~~`DELETE /profile` path documented as `/profile/delete` in OpenAPI~~ — fixed
7. ~~2FA verify schema used `recovery_code` string instead of `is_recovery_code` boolean~~ — fixed
8. ~~Passkey `{id}` parameter typed as integer instead of string~~ — fixed

### Implementation Gaps

**Batch 1 (Auth & Identity):**
1. ~~`SSOController::linkedAccounts()` unrouted~~ — added `GET /auth/sso/linked-accounts` route
2. ~~Passkey login rate limiting too permissive (`throttle:10,1` vs `rate.sensitive`)~~ — upgraded to `rate.sensitive:passkey`

### ADR Updates Needed

_(None found in Batch 1)_

---

## Cross-Cutting Checks

After all batches, verify these global concerns:

- [ ] All 240 routes in `api.php` are documented in `README.md`
- [ ] All endpoints in `openapi.yaml` actually exist in `api.php`
- [ ] No orphaned endpoints (in code but not docs, or in docs but not code)
- [ ] Rate limiting documented matches middleware applied
- [ ] Permission/middleware requirements match docs
- [ ] Error response schemas in OpenAPI match actual error responses
