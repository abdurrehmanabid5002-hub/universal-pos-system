-- Migration 002: Catalog and Pricing
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  parent_id UUID,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, name),
  FOREIGN KEY (business_id, parent_id)
    REFERENCES categories(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  category_id UUID,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  product_type VARCHAR(30) NOT NULL DEFAULT 'stock'
    CHECK (product_type IN ('stock', 'service', 'non_stock')),
  base_unit VARCHAR(30) NOT NULL DEFAULT 'piece',
  cost_price NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  selling_price NUMERIC(19,4) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  tracks_inventory BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, id),
  UNIQUE (business_id, sku),
  FOREIGN KEY (business_id, category_id)
    REFERENCES categories(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  sku VARCHAR(100) NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_price NUMERIC(19,4),
  selling_price NUMERIC(19,4),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  UNIQUE (business_id, id),
  UNIQUE (business_id, sku),
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT,
  CHECK (cost_price IS NULL OR cost_price >= 0),
  CHECK (selling_price IS NULL OR selling_price >= 0)
);

CREATE TABLE IF NOT EXISTS product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  product_id UUID NOT NULL,
  variant_id UUID,
  barcode VARCHAR(100) NOT NULL,
  barcode_type VARCHAR(30) NOT NULL DEFAULT 'standard',
  UNIQUE (business_id, barcode),
  FOREIGN KEY (business_id, product_id)
    REFERENCES products(business_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (business_id, variant_id)
    REFERENCES product_variants(business_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS tax_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(60) NOT NULL,
  UNIQUE (business_id, id),
  UNIQUE (business_id, code)
);

CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  tax_category_id UUID NOT NULL,
  rate NUMERIC(9,6) NOT NULL CHECK (rate >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  UNIQUE (business_id, id),
  FOREIGN KEY (business_id, tax_category_id)
    REFERENCES tax_categories(business_id, id) ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(business_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_products_category ON products(business_id, category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(business_id, product_id);
CREATE INDEX IF NOT EXISTS idx_barcodes_lookup ON product_barcodes(business_id, barcode);
