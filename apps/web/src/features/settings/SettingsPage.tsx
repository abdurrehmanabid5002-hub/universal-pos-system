import React, { useState, useEffect } from 'react';
import {
  Building2,
  Store,
  Layers,
  UtensilsCrossed,
  Pill,
  Smartphone,
  ShieldAlert,
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const SettingsPage: React.FC = () => {
  const { activeBusiness, activeBranch } = useAuth();
  const businessId = activeBusiness?.businessId;

  const [activeTab, setActiveTab] = useState<'branches' | 'registers' | 'industry' | 'audit'>('branches');
  const [branches, setBranches] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [restaurantTables, setRestaurantTables] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Branch Modal
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');

  // Add Register Modal
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regBranchId, setRegBranchId] = useState('');
  const [regName, setRegName] = useState('');
  const [regCode, setRegCode] = useState('');

  // Add Restaurant Table Modal
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('4');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [br, reg] = await Promise.all([
        api.getBranches(businessId).catch(() => []),
        api.getRegisters(businessId).catch(() => []),
      ]);
      setBranches(br || []);
      setRegisters(reg || []);
      if (br && br.length > 0 && !regBranchId) {
        setRegBranchId(br[0].id);
      }

      if (activeTab === 'industry') {
        const [tbl, med, ser] = await Promise.all([
          api.getRestaurantTables(businessId).catch(() => []),
          api.getMedicines(businessId).catch(() => []),
          api.getSerials(businessId).catch(() => []),
        ]);
        setRestaurantTables(tbl || []);
        setMedicines(med || []);
        setSerials(ser || []);
      } else if (activeTab === 'audit') {
        const logs = await api.getAuditLogs(businessId).catch(() => []);
        setAuditLogs(logs || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId, activeTab]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !branchName.trim() || !branchCode.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await api.createBranch(businessId, {
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
      });
      setMessage({ type: 'success', text: `Branch "${branchName}" created successfully!` });
      setBranchName('');
      setBranchCode('');
      setBranchModalOpen(false);
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to create branch.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !regName.trim() || !regCode.trim() || !regBranchId) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await api.createRegister(businessId, {
        branchId: regBranchId,
        name: regName.trim(),
        code: regCode.trim().toUpperCase(),
      });
      setMessage({ type: 'success', text: `Register "${regName}" created successfully!` });
      setRegName('');
      setRegCode('');
      setRegModalOpen(false);
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to create register.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !tableNumber.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await api.createRestaurantTable(businessId, {
        branchId: activeBranch?.id || branches[0]?.id,
        tableNumber: tableNumber.trim(),
        seatingCapacity: parseInt(seatingCapacity, 10),
      });
      setMessage({ type: 'success', text: `Table "${tableNumber}" added successfully!` });
      setTableNumber('');
      setTableModalOpen(false);
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to create restaurant table.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Store Settings & Configuration
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
          Branches, POS registers, industry verticals, and immutable audit logs
        </p>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('branches')}
          className={`btn ${activeTab === 'branches' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Building2 size={16} />
          <span>Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('registers')}
          className={`btn ${activeTab === 'registers' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Store size={16} />
          <span>POS Registers ({registers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('industry')}
          className={`btn ${activeTab === 'industry' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <UtensilsCrossed size={16} />
          <span>Industry Extensions</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <ShieldAlert size={16} />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Tab 1: Branches */}
      {activeTab === 'branches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Active Store Branches</h3>
            <button onClick={() => setBranchModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>Add Branch</span>
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Branch Code</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.name}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2563eb' }}>
                        {b.code}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-cashier">{b.status || 'Active'}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Registers */}
      {activeTab === 'registers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Configured Terminals & Registers</h3>
            <button onClick={() => setRegModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={16} />
              <span>Add Register</span>
            </button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Register Name</th>
                  <th>Terminal Code</th>
                  <th>Branch Code</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {registers.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2563eb' }}>
                        {r.code}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: '#64748b' }}>{r.branch_code || 'MAIN'}</span>
                    </td>
                    <td>
                      <span className="badge badge-cashier">{r.status || 'Active'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Industry Workflows */}
      {activeTab === 'industry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Restaurant Tables Section */}
          <div className="pos-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UtensilsCrossed size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Restaurant Floor & Table Management
                </h3>
              </div>
              <button onClick={() => setTableModalOpen(true)} className="btn btn-secondary btn-sm">
                <Plus size={16} />
                <span>Add Table</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {restaurantTables.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  No tables configured. Click "Add Table" to map floor layout.
                </div>
              ) : (
                restaurantTables.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: 16,
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                      Table {t.table_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                      Capacity: {t.seating_capacity} seats
                    </div>
                    <span className="badge badge-cashier" style={{ marginTop: 8 }}>
                      {t.status || 'Available'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pharmacy Batch & Expiry Section */}
          <div className="pos-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Pill size={20} color="#16a34a" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Pharmacy Prescription & Batch Tracking
              </h3>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch #</th>
                    <th>Expiry Date</th>
                    <th>Dosage / Generic</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                        No pharmacy medicine batches logged.
                      </td>
                    </tr>
                  ) : (
                    medicines.map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.product_name || m.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{m.batch_number || 'BATCH-001'}</td>
                        <td style={{ color: '#d97706', fontWeight: 600 }}>
                          {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>{m.dosage_form || 'Tablet'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Electronics Serial Numbers */}
          <div className="pos-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Smartphone size={20} color="#9333ea" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Electronics Serial & IMEI Tracking
              </h3>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Serial / IMEI Number</th>
                    <th>Warranty Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serials.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                        No electronics serial records registered.
                      </td>
                    </tr>
                  ) : (
                    serials.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600 }}>{s.product_name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2563eb' }}>
                          {s.serial_number}
                        </td>
                        <td>{s.warranty_months ? `${s.warranty_months} months` : 'Standard'}</td>
                        <td>
                          <span className="badge badge-manager">{s.status || 'In Stock'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            System Audit Trail & Compliance Ledger
          </h3>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Action</th>
                  <th>Entity Type</th>
                  <th>Actor / User</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            color: '#2563eb',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td>{log.entity_type}</td>
                      <td>{log.actor_email || log.user_id?.substring(0, 8) || 'System'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{log.ip_address || '127.0.0.1'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      <Modal isOpen={branchModalOpen} onClose={() => setBranchModalOpen(false)} title="Create New Branch">
        <form onSubmit={handleCreateBranch} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Branch Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Uptown Supermarket"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Branch Code (Identifier) *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. UPTOWN-01"
              value={branchCode}
              onChange={(e) => setBranchCode(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setBranchModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Register Modal */}
      <Modal isOpen={regModalOpen} onClose={() => setRegModalOpen(false)} title="Create POS Register">
        <form onSubmit={handleCreateRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Branch Assignment
            </label>
            <select
              className="input-field"
              value={regBranchId}
              onChange={(e) => setRegBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Register Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Register 02 (Express Checkout)"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Register Code *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. REG-02"
              value={regCode}
              onChange={(e) => setRegCode(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setRegModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Creating...' : 'Create Register'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Restaurant Table Modal */}
      <Modal isOpen={tableModalOpen} onClose={() => setTableModalOpen(false)} title="Add Restaurant Table">
        <form onSubmit={handleCreateTable} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Table Number / Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. T-12"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Seating Capacity
            </label>
            <input
              type="number"
              min="1"
              max="30"
              required
              className="input-field"
              value={seatingCapacity}
              onChange={(e) => setSeatingCapacity(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setTableModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Saving...' : 'Add Table'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
