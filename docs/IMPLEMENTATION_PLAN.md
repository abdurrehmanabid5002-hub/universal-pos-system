# Universal POS System - Implementation Plan

Status Legend:
- `[ ] TODO`
- `[/] IN PROGRESS`
- `[X] DONE`
- `[!] BLOCKED`

---

## Phase 1: Repository and Developer Environment
- [X] Initialize monorepo root `package.json` with npm workspaces (`apps/*`, `packages/*`)
- [X] Configure `tsconfig.base.json` and package-specific TypeScript configurations
- [X] Setup code quality configs: ESLint (`packages/eslint-config`), Prettier, `.gitignore`
- [X] Setup `packages/shared` (types, utilities, decimal math helpers, constants, currency definitions)
- [X] Setup `packages/contracts` (API request/response DTO contracts, enums, error codes)
- [ ] Setup backend NestJS application in `apps/api`
- [ ] Setup frontend React + Vite + TypeScript application in `apps/web`
- [X] Setup `docker-compose.yml` for PostgreSQL 15+ container and dev tooling
- [X] Setup local PostgreSQL scripts for standalone Windows development/testing (`db:start`, `db:stop`, `db:migrate`, `db:seed`)
- [X] Create `.env.example` and local `.env` configuration
- [X] Create GitHub CI workflow (`.github/workflows/checks.yml`, `deploy.yml`)
- [ ] Create project `README.md` with setup prerequisites, development instructions, architecture overview

## Phase 2: Database Schema & Tenancy Architecture
- [X] Setup database migration runner with atomic transaction execution and migration tracking table (`_migrations`)
- [X] Create Migration 001: Identity and Tenancy (`businesses`, `users`, `permissions`, `roles`, `role_permissions`, `memberships`, `branches`, `branch_memberships`, `registers`)
- [X] Create Migration 002: Catalog and Pricing (`categories`, `products`, `product_variants`, `product_barcodes`, `tax_categories`, `tax_rates`)
- [X] Create Migration 003: Inventory (`inventory_locations`, `product_batches`, `inventory_balances`, `inventory_movements`, `stock_transfers`, `stock_transfer_lines`)
- [X] Create Migration 004: Sales, Sale Items, Payments, Returns (`sales`, `sale_items`, `payments`, `payment_attempts`, `returns`, `return_items`)
- [X] Create Migration 005: Purchasing (`suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`, `supplier_invoices`, `supplier_payments`)
- [X] Create Migration 006: Customers (`customers`, `customer_ledger_entries`, `loyalty_accounts`, `loyalty_transactions`)
- [X] Create Migration 007: Register Sessions and Expenses (`register_sessions`, `register_cash_movements`, `expenses`)
- [X] Create Migration 008: Industry Extensions (`restaurant_*`, `pharmacy_*`, `clothing_*`, `electronics_*`, `grocery_*`, `wholesale_*`, `bookshop_*`)
- [X] Create Migration 009: Audit Logs, Idempotency, and Outbox Events (`audit_logs`, `idempotency_records`, `outbox_events`)
- [X] Create development seed script (`database/seeds/development.sql`) with initial system permissions and superadmin
- [X] Create demo business seed script (`database/seeds/demo-business.sql`) with a sample retail store (General Retail)
- [X] Implement database service / connection pool in NestJS (`apps/api/src/database`) with strict tenant isolation helper
- [X] Implement multi-tenant isolation unit and integration tests (ensuring cross-business reads/writes fail)

## Phase 3: Authentication and Access Control
- [X] Server-managed session authentication (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/me`, `/api/v1/auth/refresh`)
- [X] Password hashing with Argon2 / bcrypt and secure cookie management (HttpOnly, SameSite, Secure)
- [X] Session storage and revocation mechanism (revoking on disable/suspension)
- [X] Business context middleware & guard (`TenantGuard`, validating active membership in the business)
- [X] RBAC & Permissions Guard (`PermissionsGuard`, verifying fine-grained permissions)
- [X] Branch scope Guard (`BranchScopeGuard`, enforcing branch access constraints)
- [X] Audit logging interceptor / service recording actions, actor, entity, tenant ID, request ID
- [X] Unit & integration tests for Auth, RBAC, branch isolation, and privilege escalation prevention

## Phase 4: Product Catalog and Inventory Ledger
- [X] Category management API (`/api/v1/businesses/:id/categories`)
- [X] Product and variant management API with barcode lookups (`/api/v1/businesses/:id/products`)
- [X] Tax categories and rates management API (`/api/v1/businesses/:id/taxes`)
- [X] Inventory locations management API (`/api/v1/businesses/:id/inventory/locations`)
- [X] Immutable inventory ledger service: append-only stock movements (`opening`, `purchase`, `sale`, `return`, `adjustment`, `transfer_in`, `transfer_out`, `damage`, `waste`)
- [X] Atomically maintained inventory balances with row locking / optimistic locking
- [X] Stock adjustments API (`POST /api/v1/businesses/:id/inventory/adjustments`) with strict negative stock policy
- [X] Stock reconciliation service (verifying balance snapshot against movement history)
- [X] Purchase receiving workflow (`POST /api/v1/businesses/:id/goods-receipts`) updating inventory idempotently
- [X] Automated integration tests for catalog, movement ledger, and balance reconciliation

## Phase 5: POS Checkout & Authoritative Pricing Core
- [X] Server-side authoritative calculation service: prices, taxes, line discounts, cart discounts, totals, change
- [X] Idempotent checkout endpoint (`POST /api/v1/businesses/:id/sales` with `Idempotency-Key` header)
- [X] Atomic sale transaction: validate register, lock and verify stock balances, create sale & line item snapshots, append inventory movements, record payment, create audit log, insert outbox event
- [X] Receipt generation and formatting (printable standard format, tax breakdown, business metadata)
- [X] Stock concurrency tests (simultaneous checkout of final stock item, verifying no overselling)
- [X] Idempotency tests (replay same checkout key, ensuring single sale and single stock deduction)

## Phase 6: Payments, Returns, and Register Sessions
- [X] Register sessions API (`POST /api/v1/businesses/:id/registers/open`, `POST /api/v1/businesses/:id/registers/close`, `GET /api/v1/businesses/:id/registers/current`)
- [X] Cash movement tracking (opening float, cash sales, cash drops, pay-ins, pay-outs, expected vs actual cash reconciliation)
- [X] Extensible payment provider abstraction (cash, card terminal, manual mobile pay, webhook-based electronic provider)
- [X] Idempotent refund and return processing API (`POST /api/v1/businesses/:id/returns`)
- [X] Return validation: verify returnable quantity against original sale items, prevent over-returning
- [X] Restock options on return (`restocked` -> adds inventory movement, `damaged` / `not_restocked` -> no stock increase)
- [X] Concurrency and integrity tests for returns and register closing

## Phase 7: Customers, Purchasing, Expenses, and Financial Reports
- [X] Customers management API with search and history (`/api/v1/businesses/:id/customers`)
- [X] Suppliers and Purchase Orders API (`/api/v1/businesses/:id/suppliers`, `/api/v1/businesses/:id/purchase-orders`)
- [X] Expenses management API with categories and branch assignment (`/api/v1/businesses/:id/expenses`)
- [X] Authoritative Sales Report API (`GET /api/v1/businesses/:id/reports/sales`) with date filtering, branch grouping, cashier grouping
- [X] Authoritative Inventory Valuation & Movement Report (`GET /api/v1/businesses/:id/reports/inventory`)
- [X] Gross Profit & Margin Report (`GET /api/v1/businesses/:id/reports/profit`) based on COGS snapshots
- [X] Audit Log search API (`GET /api/v1/businesses/:id/audit-logs`)
- [X] Financial report reconciliation tests

## Phase 8: Frontend Web Application (React + Vite + TanStack Query)
- [X] Design System & Accessible Component Library in `apps/web/src/components/ui` (buttons, inputs, modals, data tables, notifications, badges, cards, tabs)
- [X] Auth & Session Management UI (Register, Login, Switch Business, Logout, Protected Routes)
- [X] Business & Branch Onboarding UI
- [X] Product & Inventory Management UI (catalog table, create/edit modal, barcode scanning, stock adjustment modal, inventory history)
- [X] High-Performance POS Checkout Interface:
  - Fast barcode scanning & fuzzy product search
  - Cart management with quantity updates, item discounts, cart discounts
  - Register session status indicator & open/close modal
  - Multi-payment modal (Cash with quick tender amounts, card, split payment)
  - Printable / Viewable receipt modal with clean printable CSS
- [X] Sales History & Return Processing UI (lookup receipt, select returnable items, process refund)
- [X] Purchasing & Receiving UI (view POs, receive goods into stock)
- [X] Expenses & Register Reconciliation UI (record cash drops, view session closing report)
- [X] Reports & Analytics Dashboard UI (Sales, Inventory, Gross Profit charts & tables)
- [X] Audit Log Viewer UI

## Phase 9: Industry Extensions Core
- [X] General Retail / Grocery: weighed items, barcode types, unit conversions
- [X] Restaurant Extension: tables, kitchen order tickets, order modifiers
- [X] Pharmacy Extension: batch number tracking, expiry date enforcement
- [X] Clothing Extension: size and color matrix variants

## Phase 10: Production Hardening, Observability, and Release Gates
- [X] OpenAPI / Swagger documentation (`/api/docs`) with request/response schema specifications
- [X] Database ERD and Architecture documentation updated
- [X] System Health & Readiness endpoints (`/health/liveness`, `/health/readiness`)
- [X] Structured logging with request ID and tenant ID tracking
- [X] Automated end-to-end integration test verifying the complete General Retail flow:
  `create business -> add product -> receive stock -> open register -> sell product -> print receipt -> return item -> reconcile inventory and cash`
- [X] Security audit: verify cross-tenant blocks, permission checks, injection prevention, password sanitization
- [X] Verification of all exit criteria and release gates
