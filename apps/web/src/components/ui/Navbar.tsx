import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  Layers,
  History,
  Truck,
  DollarSign,
  BarChart3,
  LogOut,
  Store,
} from 'lucide-react';
import { useAuth } from '../../app/providers';

export const Navbar: React.FC = () => {
  const { user, activeBusiness, activeBranch, activeRegister, logout, memberships, setActiveBusiness } = useAuth();

  const navItems = [
    { to: '/pos', label: 'POS Terminal', icon: <ShoppingCart size={18} /> },
    { to: '/products', label: 'Products', icon: <Package size={18} /> },
    { to: '/inventory', label: 'Inventory', icon: <Layers size={18} /> },
    { to: '/sales', label: 'Sales & Returns', icon: <History size={18} /> },
    { to: '/purchasing', label: 'Purchasing', icon: <Truck size={18} /> },
    { to: '/expenses', label: 'Expenses', icon: <DollarSign size={18} /> },
    { to: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> },
  ];

  return (
    <header
      style={{
        background: 'linear-gradient(180deg, #0b1528 0%, #07101e 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '64px',
          gap: 20,
        }}
      >
        {/* Brand & Store Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
              }}
            >
              <Store size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                Tamam<span style={{ color: '#38bdf8' }}>POS</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {activeBusiness ? activeBusiness.businessName : 'Universal POS'}
              </div>
            </div>
          </div>

          {memberships.length > 1 && (
            <select
              className="input-field"
              style={{
                width: 'auto',
                padding: '4px 10px',
                fontSize: '0.8rem',
                background: '#1e293b',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.12)',
              }}
              value={activeBusiness?.businessId || ''}
              onChange={(e) => {
                const found = memberships.find((m) => m.businessId === e.target.value);
                if (found) setActiveBusiness(found);
              }}
            >
              {memberships.map((m) => (
                <option key={m.businessId} value={m.businessId}>
                  {m.businessName} ({m.roleName})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Navigation tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? '#2563eb' : 'transparent',
                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
                transition: 'all 0.15s ease',
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User profile & Register indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {activeRegister && (
            <div
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Reg: <strong style={{ color: 'var(--text-primary)' }}>{activeRegister.name}</strong>
            </div>
          )}

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {user?.fullName || user?.full_name || user?.email || 'User'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {activeBusiness?.roleName || 'Staff'}
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="btn btn-ghost btn-sm"
            title="Log out"
            style={{ color: 'var(--danger)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
