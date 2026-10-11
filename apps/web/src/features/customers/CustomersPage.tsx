import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  ShoppingBag,
  History,
  CheckCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const CustomersPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.businessId;
  const currency = activeBusiness?.defaultCurrency || 'PKR';

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Customer Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Customer History Modal
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const loadCustomers = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await api.getCustomers(businessId, search);
      setCustomers(data || []);
    } catch (e: any) {
      console.error('Failed to load customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [businessId, search]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !name.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      await api.createCustomer(businessId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      setMessage({ type: 'success', text: `Customer "${name}" created successfully!` });
      setName('');
      setPhone('');
      setEmail('');
      setModalOpen(false);
      await loadCustomers();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to create customer.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
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
            Customers & Loyalty
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Manage client directory, track repeat sales, and store contact info
          </p>
        </div>

        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          <UserPlus size={18} />
          <span>+ Add Customer</span>
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

      {/* Search Toolbar */}
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
        <div style={{ position: 'relative', width: 340 }}>
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
            placeholder="Search customers by name, phone, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 38 }}
          />
        </div>

        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          Registered Customers: <strong style={{ color: '#0f172a' }}>{customers.length}</strong>
        </div>
      </div>

      {/* Customer Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Customer Code</th>
              <th>Created</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                  Loading customer directory...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                  No customers found. Click "+ Add Customer" to add your first customer.
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        className="user-avatar"
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 700,
                        }}
                      >
                        {cust.name ? cust.name[0].toUpperCase() : 'C'}
                      </div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{cust.name}</div>
                    </div>
                  </td>

                  <td>
                    {cust.phone ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Phone size={14} color="#64748b" />
                        <span>{cust.phone}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>

                  <td>
                    {cust.email ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Mail size={14} color="#64748b" />
                        <span>{cust.email}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>

                  <td>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        background: '#f1f5f9',
                        borderRadius: '4px',
                        color: '#475569',
                      }}
                    >
                      {cust.customer_code || 'WALK-IN'}
                    </span>
                  </td>

                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {cust.created_at ? new Date(cust.created_at).toLocaleDateString() : 'Active'}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setHistoryOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <ShoppingBag size={14} />
                      <span>History</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register Customer">
        <form onSubmit={handleCreateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Phone Number
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. +92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer History Modal */}
      <Modal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Purchase History - ${selectedCustomer?.name || 'Customer'}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 16,
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedCustomer?.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {selectedCustomer?.phone || selectedCustomer?.email || 'No contact provided'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-cashier">Verified Account</span>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
            To view individual sale receipts for this customer, inspect the receipts list in the Sales & Returns screen.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setHistoryOpen(false)} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
