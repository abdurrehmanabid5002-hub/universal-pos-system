-- Migration 004: Sales, Sale Items, Payments, Returns
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  register_id UUID NOT NULL,
  cashier_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_id UUID,
  receipt_number VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_payment', 'completed', 'cancelled', 'voided')),
  currency CHAR(3) NOT NULL,
  subtotal NUMERIC(19,4) NOT NULL DEFAULT 0,
  discount_total NUMERIC(19,4) NOT NULL DEFAULT 0,
  tax_total NUMERIC(19,4) NOT NULL DEFAULT 0,
  grand_total NUMERIC(19,4) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(19,4) NOT NULL DEFAULT 0,
  change_due NUMERIC(19,4) NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, receipt_number),
  UNIQUE (business_id, idempotency_key),
  FOREIGN KEY (business_id, branch_id) REFERENCES branches(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, register_id) REFERENCES registers(business_id, id) ON DELETE RESTRICT,
  CHECK (subtotal >= 0 AND discount_total >= 0 AND tax_total >= 0 AND grand_total >= 0 AND amount_paid >= 0 AND change_due >= 0)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  sale_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  product_name_snapshot VARCHAR(200) NOT NULL,
  sku_snapshot VARCHAR(100) NOT NULL,
  quantity NUMERIC(19,4) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(19,4) NOT NULL CHECK (unit_price >= 0),
  unit_cost_snapshot NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (unit_cost_snapshot >= 0),
  discount_amount NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total NUMERIC(19,4) NOT NULL CHECK (line_total >= 0),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, sale_id) REFERENCES sales(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, product_id) REFERENCES products(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, variant_id) REFERENCES product_variants(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  sale_id UUID NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'succeeded', 'failed', 'cancelled', 'refunded')),
  provider_reference VARCHAR(200),
  idempotency_key VARCHAR(160) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, idempotency_key),
  FOREIGN KEY (business_id, sale_id) REFERENCES sales(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  payment_id UUID NOT NULL,
  amount NUMERIC(19,4) NOT NULL,
  status VARCHAR(24) NOT NULL,
  provider_request JSONB DEFAULT '{}'::jsonb,
  provider_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, payment_id) REFERENCES payments(business_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  original_sale_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  return_number VARCHAR(80) NOT NULL,
  processed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  refund_total NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (refund_total >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, return_number),
  FOREIGN KEY (business_id, original_sale_id) REFERENCES sales(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, branch_id) REFERENCES branches(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  return_id UUID NOT NULL,
  original_sale_item_id UUID NOT NULL,
  quantity NUMERIC(19,4) NOT NULL CHECK (quantity > 0),
  refund_amount NUMERIC(19,4) NOT NULL CHECK (refund_amount >= 0),
  restock_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (restock_status IN ('pending', 'restocked', 'damaged', 'not_restocked')),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, return_id) REFERENCES returns(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, original_sale_item_id) REFERENCES sale_items(business_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sales_branch_date ON sales(business_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(business_id, sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(business_id, sale_id, status);
