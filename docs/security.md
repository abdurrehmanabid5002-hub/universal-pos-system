# Universal POS Security Architecture & Threat Model

This document outlines the security controls, authentication mechanisms, tenant isolation enforcement, and audit protections implemented across the Universal POS SaaS platform.

---

## 1. Authentication & Session Management
- **Server-Managed Sessions:** High-entropy cryptographically secure random session tokens (256-bit SHA-256 hashed in database).
- **Cookie Security:** Web clients authenticate via `HttpOnly`, `SameSite=Lax`, and `Secure` cookies (`pos_session`). Raw tokens are never accessible via JavaScript.
- **Session Revocation:** Disabling a user account or suspending a membership immediately invalidates all active sessions.
- **Password Security:** Salted bcrypt hashing (cost factor 10) for stored credentials.

## 2. Multi-Tenant Authorization & Isolation
Every protected endpoint applies a multi-layered guard chain:
1. `AuthGuard`: Validates session existence, expiration, and user account status (`active`).
2. `TenantGuard`: Enforces that the authenticated user holds an active membership within the targeted business (`business_id`). Rejects cross-tenant attempts with HTTP 403 Forbidden.
3. `PermissionsGuard`: Enforces role-based access control (RBAC). Evaluates fine-grained permissions against the user's active role.
4. `BranchScopeGuard`: Verifies that employees assigned to specific branches cannot read or alter records belonging to other branches.

## 3. Database Layer Defense in Depth
- **Composite Foreign Keys:** References such as `(business_id, product_id)` and `(business_id, id)` prevent database-level foreign key link injection across tenants.
- **SQL Injection Prevention:** All database queries utilize parameterized SQL queries through `pg.Pool` (`$1`, `$2`, etc.), preventing SQL injection.
- **Atomic Concurrency Locking:** Checkout and inventory adjustments lock affected balance rows with `SELECT ... FOR UPDATE` inside ACID transactions, preventing race condition overselling.

## 4. Audit Logging & Sensitive Data Scrubbing
- **Automatic Audit Trail:** Mutating operations log the actor user ID, business ID, action name, entity type, entity ID, timestamp, and request ID.
- **Data Scrubbing:** Sensitive keys (`password`, `secret`, `token`, `cardNumber`, `cvv`) are automatically sanitized and replaced with `[REDACTED]` before persistence in `audit_logs`.
