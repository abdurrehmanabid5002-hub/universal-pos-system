-- Migration 006: Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  customer_code VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(40),
  email VARCHAR(254),
  credit_limit NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, customer_code)
);

CREATE TABLE IF NOT EXISTS customer_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('invoice', 'payment', 'refund', 'adjustment')),
  amount NUMERIC(19,4) NOT NULL,
  balance_after NUMERIC(19,4) NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, customer_id) REFERENCES customers(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  customer_id UUID NOT NULL UNIQUE,
  points_balance NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  tier VARCHAR(30) NOT NULL DEFAULT 'standard',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, customer_id) REFERENCES customers(business_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(business_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(business_id, phone);
