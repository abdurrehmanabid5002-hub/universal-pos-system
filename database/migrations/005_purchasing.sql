-- Migration 005: Purchasing
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  supplier_code VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  contact_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, supplier_code)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  order_number VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft', 'approved', 'partially_received', 'received', 'cancelled')),
  currency CHAR(3) NOT NULL,
  total NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, order_number),
  FOREIGN KEY (business_id, branch_id) REFERENCES branches(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, supplier_id) REFERENCES suppliers(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  quantity_ordered NUMERIC(19,4) NOT NULL CHECK (quantity_ordered > 0),
  quantity_received NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost NUMERIC(19,4) NOT NULL CHECK (unit_cost >= 0),
  FOREIGN KEY (business_id, purchase_order_id)
    REFERENCES purchase_orders(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT,
  CHECK (quantity_received <= quantity_ordered)
);

CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  location_id UUID NOT NULL,
  purchase_order_id UUID,
  supplier_id UUID NOT NULL,
  receipt_number VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL,
  received_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  notes TEXT,
  UNIQUE (business_id, id),
  UNIQUE (business_id, receipt_number),
  UNIQUE (business_id, idempotency_key),
  FOREIGN KEY (business_id, branch_id) REFERENCES branches(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, location_id) REFERENCES inventory_locations(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, supplier_id) REFERENCES suppliers(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  goods_receipt_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  batch_id UUID,
  quantity_received NUMERIC(19,4) NOT NULL CHECK (quantity_received > 0),
  unit_cost NUMERIC(19,4) NOT NULL CHECK (unit_cost >= 0),
  FOREIGN KEY (business_id, goods_receipt_id)
    REFERENCES goods_receipts(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  purchase_order_id UUID,
  invoice_number VARCHAR(80) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(19,4) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'voided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, supplier_id) REFERENCES suppliers(business_id, id) ON DELETE RESTRICT
);
