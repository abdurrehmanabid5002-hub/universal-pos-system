-- Seed: Demo Business and Catalog
DO $$
DECLARE
  v_user_id UUID := 'aaaaaaaa-1111-1111-1111-111111111111';
  v_biz_id UUID := 'bbbbbbbb-2222-2222-2222-222222222222';
  v_role_owner_id UUID := '22222222-0000-0000-0000-000000000001';
  v_branch_id UUID := 'cccccccc-3333-3333-3333-333333333333';
  v_register_id UUID := 'dddddddd-4444-4444-4444-444444444444';
  v_loc_id UUID := 'eeeeeeee-5555-5555-5555-555555555555';
  v_cat_dairy UUID := 'f0000001-0000-0000-0000-000000000001';
  v_cat_bakery UUID := 'f0000001-0000-0000-0000-000000000002';
  v_cat_beverages UUID := 'f0000001-0000-0000-0000-000000000003';
  v_prod_milk UUID := 'f0000002-0000-0000-0000-000000000001';
  v_prod_bread UUID := 'f0000002-0000-0000-0000-000000000002';
  v_prod_water UUID := 'f0000002-0000-0000-0000-000000000003';
  v_supplier_id UUID := 'f0000003-0000-0000-0000-000000000001';
  v_customer_id UUID := 'f0000004-0000-0000-0000-000000000001';
BEGIN
  -- 1. Create Demo User (Password: Password123!)
  -- bcrypt hash for 'Password123!'
  INSERT INTO users (id, email, password_hash, full_name, status)
  VALUES (v_user_id, 'owner@apexmart.com', '$2a$10$cGJ/q6IJVTgNKQkFQDKoh.eOiW5onYdJnrP/xgv5w3whUGehSFNNe', 'Alice Founder', 'active')
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name;

  -- 2. Create Demo Business
  INSERT INTO businesses (id, name, slug, business_type, default_currency, timezone, status)
  VALUES (v_biz_id, 'Apex Supermart', 'apex-supermart', 'general_retail', 'PKR', 'Asia/Karachi', 'active')
  ON CONFLICT (slug) DO NOTHING;

  -- 3. Create Membership
  INSERT INTO memberships (id, business_id, user_id, role_id, status)
  VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', v_biz_id, v_user_id, v_role_owner_id, 'active')
  ON CONFLICT (business_id, user_id) DO NOTHING;

  -- 4. Create Branch
  INSERT INTO branches (id, business_id, name, code, address, status)
  VALUES (v_branch_id, v_biz_id, 'Main Downtown Branch', 'MAIN', '{"city": "Lahore", "address": "123 Commercial Zone"}'::jsonb, 'active')
  ON CONFLICT (business_id, code) DO NOTHING;

  -- 5. Branch membership
  INSERT INTO branch_memberships (business_id, membership_id, branch_id)
  VALUES (v_biz_id, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', v_branch_id)
  ON CONFLICT DO NOTHING;

  -- 6. Register
  INSERT INTO registers (id, business_id, branch_id, name, code, status)
  VALUES (v_register_id, v_biz_id, v_branch_id, 'Register 01', 'REG-01', 'active')
  ON CONFLICT (business_id, id) DO NOTHING;

  -- 7. Inventory Location
  INSERT INTO inventory_locations (id, business_id, branch_id, name, location_type)
  VALUES (v_loc_id, v_biz_id, v_branch_id, 'Front Shelf & Stockroom', 'stockroom')
  ON CONFLICT (business_id, id) DO NOTHING;

  -- 8. Categories
  INSERT INTO categories (id, business_id, name, description)
  VALUES
    (v_cat_dairy, v_biz_id, 'Dairy & Eggs', 'Milk, cheese, butter and eggs'),
    (v_cat_bakery, v_biz_id, 'Bakery', 'Freshly baked breads and pastries'),
    (v_cat_beverages, v_biz_id, 'Beverages', 'Water, juices and drinks')
  ON CONFLICT (business_id, name) DO NOTHING;

  -- 9. Products
  INSERT INTO products (id, business_id, category_id, sku, name, product_type, base_unit, cost_price, selling_price, tracks_inventory, status)
  VALUES
    (v_prod_milk, v_biz_id, v_cat_dairy, 'MILK-001', 'Farm Fresh Milk 1L', 'stock', 'piece', 180.0000, 220.0000, true, 'active'),
    (v_prod_bread, v_biz_id, v_cat_bakery, 'BREAD-001', 'Artisan White Bread 500g', 'stock', 'piece', 80.0000, 120.0000, true, 'active'),
    (v_prod_water, v_biz_id, v_cat_beverages, 'WATER-001', 'Mineral Spring Water 1.5L', 'stock', 'piece', 50.0000, 80.0000, true, 'active')
  ON CONFLICT (business_id, sku) DO NOTHING;

  -- 10. Barcodes
  INSERT INTO product_barcodes (business_id, product_id, barcode, barcode_type)
  VALUES
    (v_biz_id, v_prod_milk, '8900000000001', 'standard'),
    (v_biz_id, v_prod_bread, '8900000000002', 'standard'),
    (v_biz_id, v_prod_water, '8900000000003', 'standard')
  ON CONFLICT (business_id, barcode) DO NOTHING;

  -- 11. Initial Inventory Balances
  INSERT INTO inventory_balances (id, business_id, product_id, location_id, quantity_on_hand, quantity_reserved)
  VALUES
    ('b0000001-0000-0000-0000-000000000001', v_biz_id, v_prod_milk, v_loc_id, 100.0000, 0.0000),
    ('b0000001-0000-0000-0000-000000000002', v_biz_id, v_prod_bread, v_loc_id, 100.0000, 0.0000),
    ('b0000001-0000-0000-0000-000000000003', v_biz_id, v_prod_water, v_loc_id, 100.0000, 0.0000)
  ON CONFLICT (business_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), location_id, COALESCE(batch_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET quantity_on_hand = EXCLUDED.quantity_on_hand;

  -- 12. Opening inventory movements
  INSERT INTO inventory_movements (business_id, product_id, location_id, movement_type, quantity_change, unit_cost, reference_type, created_by)
  VALUES
    (v_biz_id, v_prod_milk, v_loc_id, 'opening', 100.0000, 180.0000, 'initial_stock', v_user_id),
    (v_biz_id, v_prod_bread, v_loc_id, 'opening', 100.0000, 80.0000, 'initial_stock', v_user_id),
    (v_biz_id, v_prod_water, v_loc_id, 'opening', 100.0000, 50.0000, 'initial_stock', v_user_id);

  -- 13. Demo Customer
  INSERT INTO customers (id, business_id, customer_code, name, phone, email, credit_limit, status)
  VALUES (v_customer_id, v_biz_id, 'CUST-001', 'Walk-in Customer', '+923001234567', 'customer@example.com', 0.0000, 'active')
  ON CONFLICT (business_id, customer_code) DO NOTHING;

  -- 14. Demo Supplier
  INSERT INTO suppliers (id, business_id, supplier_code, name, contact_details, status)
  VALUES (v_supplier_id, v_biz_id, 'SUP-001', 'Metro Wholesale Suppliers', '{"email": "orders@metrowholesale.com", "phone": "+923211112233"}'::jsonb, 'active')
  ON CONFLICT (business_id, supplier_code) DO NOTHING;

END $$;
