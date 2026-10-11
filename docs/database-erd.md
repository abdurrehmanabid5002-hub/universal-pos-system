# Universal POS Database ERD & Schema Documentation

The platform uses PostgreSQL 15+ with strict multi-tenant isolation, composite foreign keys, and an append-only inventory ledger.

```mermaid
erDiagram
    BUSINESSES ||--o{ BRANCHES : owns
    BUSINESSES ||--o{ USERS : employs
    BUSINESSES ||--o{ MEMBERSHIPS : assigns
    ROLES ||--o{ MEMBERSHIPS : authorizes
    ROLES ||--o{ ROLE_PERMISSIONS : defines
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : specifies
    BRANCHES ||--o{ REGISTERS : contains
    BRANCHES ||--o{ INVENTORY_LOCATIONS : contains
    REGISTERS ||--o{ REGISTER_SESSIONS : records
    REGISTER_SESSIONS ||--o{ REGISTER_CASH_MOVEMENTS : tracks
    BUSINESSES ||--o{ CATEGORIES : categorizes
    BUSINESSES ||--o{ PRODUCTS : catalogs
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    PRODUCTS ||--o{ PRODUCT_BARCODES : scans
    PRODUCTS ||--o{ INVENTORY_BALANCES : holds
    INVENTORY_LOCATIONS ||--o{ INVENTORY_BALANCES : stores
    PRODUCTS ||--o{ INVENTORY_MOVEMENTS : tracks
    INVENTORY_LOCATIONS ||--o{ INVENTORY_MOVEMENTS : logs
    BUSINESSES ||--o{ SALES : conducts
    SALES ||--o{ SALE_ITEMS : items
    SALES ||--o{ PAYMENTS : pays
    SALES ||--o{ RETURNS : returns
    RETURNS ||--o{ RETURN_ITEMS : items
    BUSINESSES ||--o{ SUPPLIERS : purchases_from
    SUPPLIERS ||--o{ GOODS_RECEIPTS : receives
    GOODS_RECEIPTS ||--o{ GOODS_RECEIPT_ITEMS : logs
    BUSINESSES ||--o{ EXPENSES : records
    BUSINESSES ||--o{ AUDIT_LOGS : audits
    BUSINESSES ||--o{ IDEMPOTENCY_RECORDS : deduplicates
    BUSINESSES ||--o{ OUTBOX_EVENTS : publishes
```

## Core Schema Rules & Guarantees
1. **Tenant Isolation:** Every business-owned entity carries `business_id UUID NOT NULL REFERENCES businesses(id)`.
2. **Composite Foreign Keys:** References such as `(business_id, product_id)` enforce that a branch or sale cannot reference products belonging to a different business.
3. **Monetary Precision:** All amounts, prices, and rates use `NUMERIC(19, 4)` to eliminate IEEE 754 floating-point inaccuracies.
4. **Append-Only Inventory Ledger:** `inventory_movements` is strictly append-only. Corrections require compensating adjustments.
5. **Operational Projections:** `inventory_balances` is updated transactionally with `FOR UPDATE` row locks to prevent overselling.
6. **Historical Sale Line Snapshots:** `sale_items` snapshots unit cost, unit price, tax, and discount at the exact moment of sale.
7. **Cash Reconciliation:** Register sessions reconcile closing cash against immutable `register_cash_movements`.
