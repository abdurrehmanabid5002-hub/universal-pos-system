-- Migration 008: Industry Extensions

-- 1. Restaurant extension
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  table_number VARCHAR(40) NOT NULL,
  seating_capacity INT NOT NULL DEFAULT 4,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (branch_id, table_number),
  FOREIGN KEY (business_id, branch_id) REFERENCES branches(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS restaurant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  table_id UUID,
  order_type VARCHAR(30) NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeout', 'delivery')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'kitchen_preparing', 'ready', 'served', 'settled', 'cancelled')),
  waiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (business_id, table_id) REFERENCES restaurant_tables(business_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS restaurant_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(19,4) NOT NULL CHECK (quantity > 0),
  modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  kitchen_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (kitchen_status IN ('pending', 'cooking', 'done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Pharmacy extension
CREATE TABLE IF NOT EXISTS pharmacy_medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL UNIQUE,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  generic_name VARCHAR(200),
  dosage_form VARCHAR(80),
  strength VARCHAR(80),
  manufacturer VARCHAR(160),
  FOREIGN KEY (business_id, product_id) REFERENCES products(business_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  doctor_name VARCHAR(160) NOT NULL,
  patient_name VARCHAR(160) NOT NULL,
  prescription_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Electronics extension
CREATE TABLE IF NOT EXISTS electronics_serials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  serial_number VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'returned', 'defective')),
  warranty_months INT NOT NULL DEFAULT 12,
  sold_sale_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, product_id, serial_number),
  FOREIGN KEY (business_id, product_id) REFERENCES products(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS repair_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  job_number VARCHAR(80) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  device_name VARCHAR(160) NOT NULL,
  issue_description TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'diagnosing', 'waiting_parts', 'repaired', 'delivered', 'cancelled')),
  estimated_cost NUMERIC(19,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Wholesale extension
CREATE TABLE IF NOT EXISTS wholesale_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  min_quantity NUMERIC(19,4) NOT NULL CHECK (min_quantity > 0),
  unit_price NUMERIC(19,4) NOT NULL CHECK (unit_price >= 0),
  FOREIGN KEY (business_id, product_id) REFERENCES products(business_id, id) ON DELETE CASCADE
);
