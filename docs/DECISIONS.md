# Universal POS System - Architectural & Engineering Decisions

This document records architectural, technical, and operational decisions and documented assumptions for the Universal POS SaaS platform.

---

## 1. Monorepo and Package Management
- **Decision:** Use standard npm workspaces with shared packages:
  - `apps/web`: React 18+ with TypeScript, Vite, TanStack Query, React Router, custom high-aesthetic design system.
  - `apps/api`: NestJS with TypeScript, Fastify/Express HTTP adapter, PostgreSQL native driver (`pg` / TypeORM or lightweight Kysely/SQL query builder with raw SQL safety for optimal performance and exact query control).
  - `packages/shared`: Shared types, decimal arithmetic utilities, currency formatting, validation helpers.
  - `packages/contracts`: Shared API request/response DTO contracts and error constants.
- **Rationale:** Strict code separation while enabling shared typing and end-to-end type safety between frontend and backend.

## 2. Multi-Tenancy Strategy
- **Decision:** Shared database and shared schema, scoped strictly by `business_id` on every tenant-owned table, reinforced by composite foreign keys (e.g. `(business_id, id)`).
- **Enforcement:**
  - Database level: composite foreign keys prevent referencing foreign records belonging to another business.
  - API level: `TenantGuard` verifies that the authenticated user possesses an active membership in the business matching the route/header context.
  - Query level: all repository operations require `businessId` parameter and enforce `WHERE business_id = $1`.
  - Defense in depth: optional PostgreSQL Row-Level Security (RLS) can be enabled per session where role privileges allow.

## 3. Decimal and Monetary Calculations
- **Decision:** PostgreSQL `NUMERIC(19, 4)` is used for all monetary values, quantities, and rates. Application code uses string-represented fixed-precision or dedicated decimal math (never binary IEEE 754 floating point arithmetic).
- **Rationale:** Floating-point rounding errors are unacceptable in financial accounting, tax calculations, and register cash reconciliation.
- **Precision:** 4 decimal places internally, rounded to currency-specific minor units (e.g. 2 decimals for standard currency, or 0 decimals where applicable) during checkout totals presentation.

## 4. Inventory Movement Invariant (Append-Only Ledger)
- **Decision:** `inventory_movements` is strictly append-only. No updates or deletions are permitted on movement rows.
- **Balance Updates:** `inventory_balances` acts as a fast operational projection cache, updated atomically inside the same database transaction as the movement insertion.
- **Reconciliation:** A periodic or on-demand reconciliation job verifies that `SUM(quantity_change) = quantity_on_hand` for every location and product.
- **Overselling Policy:** By default, negative inventory is prohibited (`CHECK (quantity_on_hand >= 0)` or transactional verification). When an adjustment or sale would cause stock < 0, an `INSUFFICIENT_STOCK` error is thrown with HTTP 422.

## 5. Sale Line Snapshots & Historical Immutability
- **Decision:** When a sale is processed, `sale_items` creates an immutable historical snapshot of the product name, SKU, unit price, unit cost (for accurate COGS and margin calculation), tax rate, and discounts.
- **Rationale:** Changing product catalog prices or names later must never distort historical receipts, tax records, or profit reports.

## 6. Authentication & Session Architecture
- **Decision:** Server-managed sessions with cryptographically secure session tokens stored in the database and delivered to the browser via `HttpOnly`, `SameSite=Lax` (or `Strict`), `Secure` cookies. Also supporting Bearer token authorization in `Authorization: Bearer <token>` for API clients and automated tests.
- **Revocation:** Disabling a user account or suspending a business membership immediately terminates and invalidates active sessions.

## 7. Idempotency for Critical Financial Operations
- **Decision:** Checkout (`POST /sales`), adjustments, and returns support `Idempotency-Key` headers. Keys are stored in `idempotency_records` with an atomic locking state (`processing`, `completed`, `failed`).
- **Rationale:** Prevents duplicate charging, duplicate sale records, and double inventory deduction upon client network retries.

## 8. Development & Standalone Database Runtime
- **Decision:** While `docker-compose.yml` provides standard containerized PostgreSQL, local development scripts automatically detect and support local PostgreSQL installations (such as the running PostgreSQL instance on port 5433 / 5432) to ensure instant zero-friction developer setup without mandatory Docker dependencies.
