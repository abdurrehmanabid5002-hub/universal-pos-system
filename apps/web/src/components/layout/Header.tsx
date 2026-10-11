import React, { useState } from 'react';
import {
  Search,
  Bell,
  Menu,
  LogOut,
  Store,
  ChevronDown,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../app/providers';

interface HeaderProps {
  onToggleSidebar: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    user,
    activeBusiness,
    activeBranch,
    activeRegister,
    memberships,
    setActiveBusiness,
    logout,
  } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);

  const getRoleBadgeClass = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
      case 'manager':
        return 'badge-manager';
      case 'cashier':
        return 'badge-cashier';
      case 'inventory staff':
        return 'badge-inventory';
      default:
        return 'badge-sales';
    }
  };

  const userInitial = user?.fullName
    ? user.fullName[0].toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : 'U';

  return (
    <header
      style={{
        height: 64,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Left: Mobile Toggle & Global Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, maxWidth: 500 }}>
        <button
          onClick={onToggleSidebar}
          className="btn btn-ghost btn-sm"
          style={{ padding: 6, display: 'flex' }}
          title="Toggle Navigation"
        >
          <Menu size={22} color="#475569" />
        </button>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            placeholder="Search products, orders, customers..."
            className="input-field"
            style={{
              paddingLeft: 38,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              height: 38,
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Right controls: Business/Branch switcher, notification, profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Active Store & Branch indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {memberships && memberships.length > 1 ? (
            <select
              className="input-field"
              style={{
                height: 36,
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                width: 'auto',
                background: '#f8fafc',
              }}
              value={activeBusiness?.businessId || ''}
              onChange={(e) => {
                const found = memberships.find((m) => m.businessId === e.target.value);
                if (found) setActiveBusiness(found);
              }}
            >
              {memberships.map((m) => (
                <option key={m.businessId} value={m.businessId}>
                  {m.businessName}
                </option>
              ))}
            </select>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                background: '#f1f5f9',
                padding: '6px 12px',
                borderRadius: '8px',
              }}
            >
              <Building2 size={16} color="#2563eb" />
              <span>{activeBusiness?.businessName || 'Store'}</span>
            </div>
          )}

          {activeRegister && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#0f172a',
                background: '#eff6ff',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #dbeafe',
              }}
            >
              <Store size={15} color="#2563eb" />
              <span>{activeRegister.name}</span>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost"
            style={{
              padding: 8,
              borderRadius: '50%',
              position: 'relative',
              color: '#64748b',
            }}
            title="Notifications"
          >
            <Bell size={20} />
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 8,
                height: 8,
                background: '#ef4444',
                borderRadius: '50%',
                border: '2px solid #ffffff',
              }}
            />
          </button>
        </div>

        {/* Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'background 0.15s ease',
            }}
          >
            <div
              className="user-avatar"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {userInitial}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                {user?.fullName || user?.full_name || 'Owner'}
              </span>
              <span
                className={`badge ${getRoleBadgeClass(activeBusiness?.roleName)}`}
                style={{ alignSelf: 'flex-start', marginTop: 2, padding: '1px 6px', fontSize: '0.7rem' }}
              >
                {activeBusiness?.roleName || 'Owner'}
              </span>
            </div>

            <ChevronDown size={14} color="#94a3b8" />
          </div>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                width: 220,
                padding: '8px',
                zIndex: 100,
              }}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                  {user?.fullName || 'Alice Founder'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user?.email}</div>
              </div>

              <div style={{ padding: '4px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#64748b',
                  }}
                >
                  <ShieldCheck size={16} color="#10b981" />
                  <span>Branch: {activeBranch?.name || 'Main Branch'}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 4 }}>
                <button
                  onClick={() => logout()}
                  className="btn btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    color: '#ef4444',
                    fontSize: '0.85rem',
                    padding: '8px 12px',
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
