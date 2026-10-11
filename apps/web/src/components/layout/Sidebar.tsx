import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Users,
  UserCheck,
  ShieldCheck,
  Truck,
  CreditCard,
  DollarSign,
  BarChart3,
  Settings,
  X,
  Sparkles,
  Store,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, collapsed = false }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={19} /> },
    { to: '/pos', label: 'POS Terminal', icon: <ShoppingCart size={19} />, highlight: true },
    { to: '/products', label: 'Products', icon: <Package size={19} /> },
    { to: '/inventory', label: 'Inventory', icon: <Layers size={19} /> },
    { to: '/sales', label: 'Sales & Returns', icon: <CreditCard size={19} /> },
    { to: '/customers', label: 'Customers', icon: <Users size={19} /> },
    { to: '/employees', label: 'Employees', icon: <UserCheck size={19} /> },
    { to: '/roles', label: 'Roles & Permissions', icon: <ShieldCheck size={19} /> },
    { to: '/purchasing', label: 'Purchasing', icon: <Truck size={19} /> },
    { to: '/registers', label: 'Cash Registers', icon: <Store size={19} /> },
    { to: '/expenses', label: 'Expenses', icon: <DollarSign size={19} /> },
    { to: '/reports', label: 'Reports', icon: <BarChart3 size={19} /> },
    { to: '/settings', label: 'Settings', icon: <Settings size={19} /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 998,
            backdropFilter: 'blur(2px)',
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          width: collapsed ? 76 : 240,
          background: 'linear-gradient(180deg, #0b1528 0%, #07101e 100%)',
          color: '#ffffff',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.2s ease',
          transform: isOpen ? 'translateX(0)' : undefined,
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.2)',
        }}
        className={`${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div
          style={{
            height: 64,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
              }}
            >
              <Sparkles size={20} />
            </div>
            {!collapsed && (
              <div>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
                  Tamam<span style={{ color: '#38bdf8' }}>POS</span>
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                  }}
                >
                  Universal POS
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ color: '#94a3b8', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </span>
              {!collapsed && (
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
              )}
              {!collapsed && item.highlight && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: '#10b981',
                    color: '#ffffff',
                    letterSpacing: '0.04em',
                  }}
                >
                  LIVE
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        {!collapsed && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.75rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ color: '#cbd5e1', fontWeight: 600 }}>Universal POS SaaS</div>
              <div>v1.0.0 • Multi-Tenant</div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
