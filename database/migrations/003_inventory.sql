-- Migration 003: Inventory
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  location_type VARCHAR(30) NOT NULL DEFAULT 'stockroom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, branch_id)
    REFERENCES branches(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, product_id, batch_number),
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  location_id UUID NOT NULL,
  batch_id UUID,
  quantity_on_hand NUMERIC(19,4) NOT NULL DEFAULT 0,
  quantity_reserved NUMERIC(19,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, variant_id)
    REFERENCES product_variants(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, location_id)
    REFERENCES inventory_locations(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, batch_id)
    REFERENCES product_batches(business_id, id) ON DELETE RESTRICT,
  CHECK (quantity_reserved >= 0 AND quantity_reserved <= quantity_on_hand)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_balance_key ON inventory_balances(
  business_id,
  product_id,
  COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
  location_id,
  COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  location_id UUID NOT NULL,
  batch_id UUID,
  movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN
    ('opening','purchase','sale','return','adjustment','transfer_in','transfer_out','damage','waste')),
  quantity_change NUMERIC(19,4) NOT NULL CHECK (quantity_change <> 0),
  unit_cost NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  reference_type VARCHAR(40),
  reference_id UUID,
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, variant_id)
    REFERENCES product_variants(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, location_id)
    REFERENCES inventory_locations(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, batch_id)
    REFERENCES product_batches(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  transfer_number VARCHAR(80) NOT NULL,
  source_location_id UUID NOT NULL,
  destination_location_id UUID NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_transit', 'received', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (business_id, id),
  UNIQUE (business_id, transfer_number),
  FOREIGN KEY (business_id, source_location_id)
    REFERENCES inventory_locations(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, destination_location_id)
    REFERENCES inventory_locations(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  transfer_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  quantity NUMERIC(19,4) NOT NULL CHECK (quantity > 0),
  FOREIGN KEY (business_id, transfer_id)
    REFERENCES stock_transfers(business_id, id) ON DELETE CASCADE,
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, variant_id)
    REFERENCES product_variants(business_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_movements_product_date
  ON inventory_movements(business_id, product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balances_location
  ON inventory_balances(business_id, location_id, product_id);
