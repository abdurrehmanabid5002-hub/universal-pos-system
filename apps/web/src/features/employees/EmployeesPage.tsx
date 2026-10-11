import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  MoreVertical,
  ShieldCheck,
  Building,
  Mail,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const EmployeesPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.businessId;

  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Invite Employee Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [roleName, setRoleName] = useState('Cashier');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [membersData, branchesData] = await Promise.all([
        api.getMembers(businessId),
        api.getBranches(businessId),
      ]);
      setMembers(membersData || []);
      setBranches(branchesData || []);
      if (branchesData && branchesData.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branchesData[0].id);
      }
    } catch (e: any) {
      console.error('Failed to load employees:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !email) return;

    setSubmitting(true);
    setMessage(null);

    try {
      await api.inviteEmployee(businessId, {
        email: email.trim(),
        roleName,
        branchIds: selectedBranchId ? [selectedBranchId] : [],
      });

      setMessage({ type: 'success', text: `Employee ${email} added/invited successfully!` });
      setEmail('');
      setModalOpen(false);
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to add employee.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
      case 'manager':
        return 'badge-manager';
      case 'cashier':
        return 'badge-cashier';
      case 'sales staff':
        return 'badge-sales';
      case 'inventory staff':
        return 'badge-inventory';
      default:
        return 'badge-support';
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.email?.toLowerCase().includes(q) ||
      m.full_name?.toLowerCase().includes(q) ||
      m.role_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Employees
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Manage your team, branch assignments, and access permissions
          </p>
        </div>

        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          <UserPlus size={18} />
          <span>+ Add Employee</span>
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#15803d' : '#b91c1c',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        className="pos-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ position: 'relative', width: 320 }}>
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
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 38 }}
          />
        </div>

        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          Total Team Members: <strong style={{ color: '#0f172a' }}>{members.length}</strong>
        </div>
      </div>

      {/* Employees Table (Matches Reference Screenshot layout) */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assigned Branches</th>
              <th>Created / Last Active</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  Loading employee records...
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                  No employees found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredMembers.map((emp) => {
                const initial = emp.full_name
                  ? emp.full_name[0].toUpperCase()
                  : emp.email[0].toUpperCase();

                return (
                  <tr key={emp.membership_id || emp.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          className="user-avatar"
                          style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            fontWeight: 700,
                          }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {emp.full_name || 'Team Member'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${getRoleBadgeClass(emp.role_name)}`}>
                        {emp.role_name || 'Staff'}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          emp.membership_status === 'active' || emp.status === 'active'
                            ? 'status-dot-active'
                            : 'status-dot-inactive'
                        }
                      >
                        {emp.membership_status === 'active' || emp.status === 'active'
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Building size={14} color="#64748b" />
                        <span>
                          {emp.branch_names && emp.branch_names.length > 0
                            ? emp.branch_names.join(', ')
                            : 'All Branches'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {emp.created_at ? new Date(emp.created_at).toLocaleDateString() : 'Active'}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 6 }}>
                        <MoreVertical size={16} color="#94a3b8" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Invite Employee Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Team Member">
        <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Employee Email Address
            </label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="cashier@apexmart.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Role & Permissions
            </label>
            <select
              className="input-field"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
            >
              <option value="Manager">Manager (Full store operations)</option>
              <option value="Cashier">Cashier (POS Checkout & Cash Register)</option>
              <option value="Inventory Staff">Inventory Staff (Stock Receipts & Adjustments)</option>
              <option value="Accountant">Accountant (Financial Reports & Expenses)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Assigned Branch
            </label>
            <select
              className="input-field"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShieldCheck size={18} color="#2563eb" />
            <span>
              Team members receive immediate access scoped strictly to the selected role and branch.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
