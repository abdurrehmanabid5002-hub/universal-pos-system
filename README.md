# Universal POS System

A commercial-grade, multi-tenant Point of Sale (POS) SaaS platform designed for retail, grocery, supermarket, pharmacy, clothing, and restaurant operations.

---

## 🌟 Key Features

- **Multi-Tenant Architecture:** Strict database and service-level tenant isolation with composite foreign keys.
- **Authoritative Server Pricing:** Server computes all taxes, line discounts, order discounts, totals, and change due.
- **Append-Only Inventory Ledger:** Immutable `inventory_movements` table with fast transactional `inventory_balances` projections.
- **Atomic Concurrency Protection:** Row-level locks (`SELECT ... FOR UPDATE`) prevent race condition overselling.
- **Register Sessions & Cash Reconciliation:** Full shift management with opening floats, pay-ins, cash drops, and shift closing variance reconciliation.
- **Idempotent Financial Transactions:** Prevents duplicate charges and multiple stock deductions on network retries.
- **Modern Web Application:** Built with React 18, TypeScript, Vite, TanStack Query, and a custom dark glassmorphic design system.
- **Printable Thermal Receipts:** Browser-native thermal receipt formatting (`window.print()`) with receipt snapshots.
- **Executive Analytics:** Real-time Gross Revenue, COGS, Gross Margin %, Operating Expenses, and Net Profit.

---

## 🏗 Repository Structure

```
universal-pos/
├── apps/
│   ├── web/        # React + TypeScript + Vite + TanStack Query frontend
│   └── api/        # Node.js + TypeScript + NestJS REST API + Swagger
├── packages/
│   ├── contracts/  # Shared API request/response DTOs, Permissions, Error codes
│   ├── shared/     # Decimal math helpers, currency definitions, domain types
│   └── eslint-config/
├── database/
│   ├── migrations/ # SQL Migrations 001 through 009
│   ├── seeds/      # System permissions and Demo business fixtures
│   ├── migrate.js  # Transactional migration runner
│   └── seed.js     # Fixture seed runner
├── docs/           # PRD, Architecture, ERD, Security, Deployment, Runbooks
└── docker-compose.yml
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js:** v20+ or v24+
- **PostgreSQL:** 15+ (local or containerized)

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `DATABASE_URL` points to your PostgreSQL database:
```env
DATABASE_URL=postgresql://pos_user@localhost:5433/universal_pos
```

### 3. Install Dependencies & Build Packages
```bash
npm install
npm run build
```

### 4. Run Migrations & Demo Seeds
```bash
# Execute SQL migrations 001 through 009
npm run db:migrate

# Seed system roles, permissions, and demo retail store
npm run db:seed
```

### 5. Run Automated Tests
```bash
# Run tenancy isolation tests
node --test database/test/tenancy_isolation.test.js

# Run full general-retail workflow E2E test
node --test apps/api/test/e2e_general_retail.test.js
```

### 6. Start Development Servers
In separate terminals:
```bash
# Start backend API (runs on http://localhost:3000)
npm run dev:api

# Start frontend web app (runs on http://localhost:5173)
npm run dev:web
```

Open your browser at `http://localhost:5173` and log in with the demo account:
- **Email:** `owner@apexmart.com`
- **Password:** `Password123!`

Open API documentation (Swagger) at:
`http://localhost:3000/api/docs`

---

## 🔒 Security & Invariants
- Passwords hashed with salted bcrypt.
- Server-managed sessions stored in PostgreSQL with SHA-256 tokens in HttpOnly cookies.
- All database queries are strictly parameterized to prevent SQL injection.
- Monetary calculations use `NUMERIC(19, 4)` and decimal scaling (no binary floating point precision loss).
- Completed sales, settled payments, and returns are permanently preserved for audit compliance.
