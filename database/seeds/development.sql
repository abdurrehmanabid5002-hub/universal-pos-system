-- Seed: System permissions and roles
INSERT INTO permissions (id, code, description) VALUES
  ('11111111-0000-0000-0000-000000000001', 'business.read', 'View business profile and details'),
  ('11111111-0000-0000-0000-000000000002', 'business.update', 'Update business settings'),
  ('11111111-0000-0000-0000-000000000003', 'settings.manage', 'Manage configuration and preferences'),
  ('11111111-0000-0000-0000-000000000004', 'branch.read', 'View branch list and status'),
  ('11111111-0000-0000-0000-000000000005', 'branch.manage', 'Create and manage branches'),
  ('11111111-0000-0000-0000-000000000006', 'employee.invite', 'Invite employees to business'),
  ('11111111-0000-0000-0000-000000000007', 'employee.manage', 'Manage employee roles and permissions'),
  ('11111111-0000-0000-0000-000000000008', 'product.read', 'View product catalog'),
  ('11111111-0000-0000-0000-000000000009', 'product.create', 'Create new products and variants'),
  ('11111111-0000-0000-0000-000000000010', 'product.update', 'Update product information and pricing'),
  ('11111111-0000-0000-0000-000000000011', 'product.archive', 'Archive or disable products'),
  ('11111111-0000-0000-0000-000000000012', 'inventory.read', 'View inventory levels and movements'),
  ('11111111-0000-0000-0000-000000000013', 'inventory.adjust', 'Perform manual stock adjustments'),
  ('11111111-0000-0000-0000-000000000014', 'inventory.transfer', 'Transfer inventory between locations'),
  ('11111111-0000-0000-0000-000000000015', 'purchase.create', 'Create purchase orders'),
  ('11111111-0000-0000-0000-000000000016', 'purchase.approve', 'Approve purchase orders'),
  ('11111111-0000-0000-0000-000000000017', 'purchase.receive', 'Receive goods shipments into stock'),
  ('11111111-0000-0000-0000-000000000018', 'sale.create', 'Operate register and execute sales'),
  ('11111111-0000-0000-0000-000000000019', 'sale.read', 'View past sales and receipt details'),
  ('11111111-0000-0000-0000-000000000020', 'sale.void', 'Void pending or completed sales'),
  ('11111111-0000-0000-0000-000000000021', 'discount.apply', 'Apply standard line or order discounts'),
  ('11111111-0000-0000-0000-000000000022', 'discount.override', 'Apply supervisor discount override'),
  ('11111111-0000-0000-0000-000000000023', 'return.create', 'Initiate returns and exchanges'),
  ('11111111-0000-0000-0000-000000000024', 'return.approve', 'Authorize product returns'),
  ('11111111-0000-0000-0000-000000000025', 'refund.process', 'Issue cash or electronic refunds'),
  ('11111111-0000-0000-0000-000000000026', 'expense.create', 'Record store expenses'),
  ('11111111-0000-0000-0000-000000000027', 'expense.approve', 'Approve store expense records'),
  ('11111111-0000-0000-0000-000000000028', 'report.sales.read', 'View sales and revenue reports'),
  ('11111111-0000-0000-0000-000000000029', 'report.inventory.read', 'View inventory valuation and movement reports'),
  ('11111111-0000-0000-0000-000000000030', 'report.profit.read', 'View margin and gross profit reports'),
  ('11111111-0000-0000-0000-000000000031', 'audit.read', 'Search security and audit logs')
ON CONFLICT (code) DO NOTHING;

-- Global System Roles
INSERT INTO roles (id, business_id, name, description, is_system) VALUES
  ('22222222-0000-0000-0000-000000000001', NULL, 'Owner', 'Full business administration', true),
  ('22222222-0000-0000-0000-000000000002', NULL, 'Manager', 'Operational management across store', true),
  ('22222222-0000-0000-0000-000000000003', NULL, 'Cashier', 'Checkout, sales, receipt issuance', true),
  ('22222222-0000-0000-0000-000000000004', NULL, 'Inventory Staff', 'Stock receiving, transfers, and counts', true),
  ('22222222-0000-0000-0000-000000000005', NULL, 'Accountant', 'Financial reporting and expense auditing', true)
ON CONFLICT DO NOTHING;

-- Map all permissions to Owner
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- Map Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-0000-0000-0000-000000000002', id FROM permissions
WHERE code NOT IN ('business.update', 'settings.manage')
ON CONFLICT DO NOTHING;

-- Map Cashier permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN ('sale.create', 'sale.read', 'product.read', 'inventory.read', 'discount.apply', 'return.create')
ON CONFLICT DO NOTHING;

-- Map Inventory Staff permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN ('inventory.read', 'inventory.adjust', 'inventory.transfer', 'purchase.create', 'purchase.receive', 'product.read')
ON CONFLICT DO NOTHING;

-- Map Accountant permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-0000-0000-0000-000000000005', id FROM permissions
WHERE code IN ('report.sales.read', 'report.inventory.read', 'report.profit.read', 'expense.create', 'expense.approve', 'sale.read')
ON CONFLICT DO NOTHING;
