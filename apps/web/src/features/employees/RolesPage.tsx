import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  Lock,
  Layers,
  ShoppingCart,
  Package,
  Users,
  Settings,
  BarChart3,
  Building,
} from 'lucide-react';
import { useAuth } from '../../app/providers';

export const RolesPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'Owner' | 'Manager' | 'Cashier' | 'Inventory Staff' | 'Accountant'>('Manager');

  const roleDefinitions = [
    {
      name: 'Owner',
      description: 'Unrestricted business ownership, financial control, and company settings.',
      color: 'badge-manager',
      permissions: [
        { code: 'dashboard', name: 'Executive Dashboard & Financial KPIs', icon: <BarChart3 size={16} />, granted: true },
        { code: 'pos_checkout', name: 'POS Checkout, Tender & Receipts', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'discounts', name: 'Apply & Override Line Discounts', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'returns', name: 'Process Returns & Issue Refunds', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'products', name: 'Catalog, Prices & Categories Management', icon: <Package size={16} />, granted: true },
        { code: 'inventory', name: 'Stock Adjustments & Warehouse Transfers', icon: <Layers size={16} />, granted: true },
        { code: 'purchasing', name: 'Purchase Orders & Supplier Receiving', icon: <Package size={16} />, granted: true },
        { code: 'registers', name: 'Open / Close Register Shift & Cash Drops', icon: <Layers size={16} />, granted: true },
        { code: 'reports', name: 'Audit Reports, Profit Margins & COGS', icon: <BarChart3 size={16} />, granted: true },
        { code: 'employees', name: 'Team Invites, Roles & Branch Scopes', icon: <Users size={16} />, granted: true },
        { code: 'settings', name: 'Business Tax, Currency & Org Profile', icon: <Settings size={16} />, granted: true },
      ],
    },
    {
      name: 'Manager',
      description: 'Store-level operations, shift auditing, refunds, and team coordination.',
      color: 'badge-manager',
      permissions: [
        { code: 'dashboard', name: 'Executive Dashboard & Financial KPIs', icon: <BarChart3 size={16} />, granted: true },
        { code: 'pos_checkout', name: 'POS Checkout, Tender & Receipts', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'discounts', name: 'Apply & Override Line Discounts', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'returns', name: 'Process Returns & Issue Refunds', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'products', name: 'Catalog, Prices & Categories Management', icon: <Package size={16} />, granted: true },
        { code: 'inventory', name: 'Stock Adjustments & Warehouse Transfers', icon: <Layers size={16} />, granted: true },
        { code: 'purchasing', name: 'Purchase Orders & Supplier Receiving', icon: <Package size={16} />, granted: true },
        { code: 'registers', name: 'Open / Close Register Shift & Cash Drops', icon: <Layers size={16} />, granted: true },
        { code: 'reports', name: 'Audit Reports, Profit Margins & COGS', icon: <BarChart3 size={16} />, granted: true },
        { code: 'employees', name: 'Team Invites, Roles & Branch Scopes', icon: <Users size={16} />, granted: true },
        { code: 'settings', name: 'Business Tax, Currency & Org Profile', icon: <Settings size={16} />, granted: false },
      ],
    },
    {
      name: 'Cashier',
      description: 'Point of sale counter cashiering, barcode scanning, and cash floats.',
      color: 'badge-cashier',
      permissions: [
        { code: 'dashboard', name: 'Executive Dashboard & Financial KPIs', icon: <BarChart3 size={16} />, granted: false },
        { code: 'pos_checkout', name: 'POS Checkout, Tender & Receipts', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'discounts', name: 'Apply & Override Line Discounts', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'returns', name: 'Process Returns & Issue Refunds', icon: <ShoppingCart size={16} />, granted: true },
        { code: 'products', name: 'Catalog, Prices & Categories Management', icon: <Package size={16} />, granted: false },
        { code: 'inventory', name: 'Stock Adjustments & Warehouse Transfers', icon: <Layers size={16} />, granted: false },
        { code: 'purchasing', name: 'Purchase Orders & Supplier Receiving', icon: <Package size={16} />, granted: false },
        { code: 'registers', name: 'Open / Close Register Shift & Cash Drops', icon: <Layers size={16} />, granted: true },
        { code: 'reports', name: 'Audit Reports, Profit Margins & COGS', icon: <BarChart3 size={16} />, granted: false },
        { code: 'employees', name: 'Team Invites, Roles & Branch Scopes', icon: <Users size={16} />, granted: false },
        { code: 'settings', name: 'Business Tax, Currency & Org Profile', icon: <Settings size={16} />, granted: false },
      ],
    },
    {
      name: 'Inventory Staff',
      description: 'Stockroom counts, receiving goods shipments, and warehouse reconciliation.',
      color: 'badge-inventory',
      permissions: [
        { code: 'dashboard', name: 'Executive Dashboard & Financial KPIs', icon: <BarChart3 size={16} />, granted: false },
        { code: 'pos_checkout', name: 'POS Checkout, Tender & Receipts', icon: <ShoppingCart size={16} />, granted: false },
        { code: 'discounts', name: 'Apply & Override Line Discounts', icon: <ShoppingCart size={16} />, granted: false },
        { code: 'returns', name: 'Process Returns & Issue Refunds', icon: <ShoppingCart size={16} />, granted: false },
        { code: 'products', name: 'Catalog, Prices & Categories Management', icon: <Package size={16} />, granted: true },
        { code: 'inventory', name: 'Stock Adjustments & Warehouse Transfers', icon: <Layers size={16} />, granted: true },
        { code: 'purchasing', name: 'Purchase Orders & Supplier Receiving', icon: <Package size={16} />, granted: true },
        { code: 'registers', name: 'Open / Close Register Shift & Cash Drops', icon: <Layers size={16} />, granted: false },
        { code: 'reports', name: 'Audit Reports, Profit Margins & COGS', icon: <BarChart3 size={16} />, granted: false },
        { code: 'employees', name: 'Team Invites, Roles & Branch Scopes', icon: <Users size={16} />, granted: false },
        { code: 'settings', name: 'Business Tax, Currency & Org Profile', icon: <Settings size={16} />, granted: false },
      ],
    },
    {
      name: 'Accountant',
      description: 'Auditing sales ledgers, expense tracking, and operating profit reports.',
      color: 'badge-sales',
      permissions: [
        { code: 'dashboard', name: 'Executive Dashboard & Financial KPIs', icon: <BarChart3 size={16} />, granted: true },
        { code: 'pos_checkout', name: 'POS Checkout, Tender & Receipts', icon: <ShoppingCart size={16} />, granted: false },
        { code: 'discounts', name: 'Apply & Override Line Discounts', icon: <ShoppingCart size={16} />, granted: false },
        { code: 'returns', name: 'Process Returns & Issue Refunds', icon: <ShoppingCart size={16} />, granted: false },
        { code: 'products', name: 'Catalog, Prices & Categories Management', icon: <Package size={16} />, granted: false },
        { code: 'inventory', name: 'Stock Adjustments & Warehouse Transfers', icon: <Layers size={16} />, granted: false },
        { code: 'purchasing', name: 'Purchase Orders & Supplier Receiving', icon: <Package size={16} />, granted: true },
        { code: 'registers', name: 'Open / Close Register Shift & Cash Drops', icon: <Layers size={16} />, granted: false },
        { code: 'reports', name: 'Audit Reports, Profit Margins & COGS', icon: <BarChart3 size={16} />, granted: true },
        { code: 'employees', name: 'Team Invites, Roles & Branch Scopes', icon: <Users size={16} />, granted: false },
        { code: 'settings', name: 'Business Tax, Currency & Org Profile', icon: <Settings size={16} />, granted: false },
      ],
    },
  ];

  const currentRole = roleDefinitions.find((r) => r.name === selectedRole)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Roles & Permissions
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
          Role-Based Access Control (RBAC) hierarchy and capability boundaries
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Role List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {roleDefinitions.map((role) => {
            const isSelected = role.name === selectedRole;
            return (
              <div
                key={role.name}
                onClick={() => setSelectedRole(role.name as any)}
                className="pos-card"
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: isSelected ? '#1e40af' : '#0f172a' }}>
                    {role.name}
                  </div>
                  <span className={`badge ${role.color}`}>{role.name}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6, lineHeight: 1.4 }}>
                  {role.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right: Permission Checklist (Matches Screenshot) */}
        <div className="pos-card" style={{ padding: '24px 28px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 20,
              borderBottom: '1px solid #e2e8f0',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                }}
              >
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  {currentRole.name} Permissions
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {currentRole.description}
                </p>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563eb' }}>
              {currentRole.permissions.filter((p) => p.granted).length} / {currentRole.permissions.length} capabilities active
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentRole.permissions.map((perm) => (
              <div
                key={perm.code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: perm.granted ? '#ffffff' : '#f8fafc',
                  border: `1px solid ${perm.granted ? '#e2e8f0' : '#f1f5f9'}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: perm.granted ? '#2563eb' : '#94a3b8' }}>{perm.icon}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: perm.granted ? '#0f172a' : '#94a3b8' }}>
                    {perm.name}
                  </span>
                </div>

                <div>
                  {perm.granted ? (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#15803d',
                      }}
                    >
                      <Check size={16} />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                      }}
                    >
                      <Lock size={14} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
