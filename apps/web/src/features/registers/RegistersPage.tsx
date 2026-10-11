import React, { useState, useEffect } from 'react';
import {
  Store,
  Lock,
  Unlock,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const RegistersPage: React.FC = () => {
  const { activeBusiness, activeBranch } = useAuth();
  const businessId = activeBusiness?.businessId;
  const currency = activeBusiness?.defaultCurrency || 'PKR';

  const [registers, setRegisters] = useState<any[]>([]);
  const [sessionsMap, setSessionsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Open Shift Modal
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [targetRegisterId, setTargetRegisterId] = useState('');
  const [openingCash, setOpeningCash] = useState('1000.00');

  // Cash In / Out Movement Modal
  const [movementModalVisible, setMovementModalVisible] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState('');
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [movementAmount, setMovementAmount] = useState('500.00');
  const [movementNote, setMovementNote] = useState('Change float top-up');

  // Close Shift Modal
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [closingRegister, setClosingRegister] = useState<any | null>(null);
  const [closingCash, setClosingCash] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const regList = await api.getRegisters(businessId, activeBranch?.id);
      setRegisters(regList || []);

      // Load active session for each register
      const map: Record<string, any> = {};
      await Promise.all(
        (regList || []).map(async (reg: any) => {
          try {
            const sess = await api.getCurrentSession(businessId, reg.id);
            if (sess) map[reg.id] = sess;
          } catch {
            // No open session
          }
        })
      );
      setSessionsMap(map);
    } catch (e: any) {
      console.error('Failed to load registers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId, activeBranch]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !targetRegisterId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      await api.openSession(businessId, {
        registerId: targetRegisterId,
        openingCash: openingCash.trim(),
      });

      setMessage({ type: 'success', text: 'Register shift opened successfully!' });
      setOpenModalVisible(false);
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to open register shift.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !targetSessionId) return;

    setSubmitting(true);
    setMessage(null);

    try {
      await api.recordCashMovement(businessId, targetSessionId, {
        movementType,
        amount: movementAmount.trim(),
        note: movementNote.trim(),
      });

      setMessage({
        type: 'success',
        text: `Recorded ${movementType === 'cash_in' ? 'Cash In' : 'Cash Drop'} of ${currency} ${movementAmount}!`,
      });
      setMovementModalVisible(false);
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to record cash movement.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !closingRegister) return;
    const session = sessionsMap[closingRegister.id];
    if (!session?.id) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await api.closeSession(businessId, session.id, {
        closingCash: closingCash.trim(),
      });

      const variance = parseFloat(res?.cashVariance || '0');
      const varStr =
        variance === 0
          ? 'Balanced perfectly!'
          : variance > 0
          ? `Cash overage of ${currency} ${variance.toFixed(2)}`
          : `Cash shortage of ${currency} ${Math.abs(variance).toFixed(2)}`;

      setMessage({
        type: 'success',
        text: `Shift closed! Expected cash was ${currency} ${parseFloat(res?.expectedClosingCash || '0').toFixed(2)}. ${varStr}`,
      });
      setCloseModalVisible(false);
      setClosingCash('');
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to close register shift.' });
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
            Cash Registers & Shift Reconciliation
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Opening floats, pay-ins, safe drops, and physical cash variance audits
          </p>
        </div>

        <button onClick={() => loadData()} className="btn btn-secondary">
          <RefreshCw size={16} />
          <span>Refresh Shifts</span>
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

      {/* Registers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            Loading register status...
          </div>
        ) : registers.length === 0 ? (
          <div className="pos-card" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            No registers found for this branch. Create a register in Settings to begin cashiering.
          </div>
        ) : (
          registers.map((reg) => {
            const activeSession = sessionsMap[reg.id];
            const isOpen = !!activeSession;

            return (
              <div key={reg.id} className="pos-card" style={{ padding: '24px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '10px',
                        background: isOpen ? '#eff6ff' : '#f1f5f9',
                        color: isOpen ? '#2563eb' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Store size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                        {reg.name}
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Code: <span style={{ fontFamily: 'var(--font-mono)' }}>{reg.code}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${isOpen ? 'badge-cashier' : 'badge-support'}`}>
                    {isOpen ? '● Shift Active' : '● Closed'}
                  </span>
                </div>

                {/* Status details */}
                {isOpen ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div
                      style={{
                        padding: '14px 16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                        <span style={{ color: '#64748b' }}>Shift Started:</span>
                        <strong style={{ color: '#0f172a' }}>
                          {new Date(activeSession.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>Opening Float:</span>
                        <strong style={{ color: '#2563eb', fontWeight: 700 }}>
                          {currency} {parseFloat(activeSession.opening_cash || '0').toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    {/* Actions for open register */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                      <button
                        onClick={() => {
                          setTargetSessionId(activeSession.id);
                          setMovementModalVisible(true);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <DollarSign size={16} />
                        <span>Cash In/Out</span>
                      </button>

                      <button
                        onClick={() => {
                          setClosingRegister(reg);
                          setClosingCash(parseFloat(activeSession.opening_cash || '0').toFixed(2));
                          setCloseModalVisible(true);
                        }}
                        className="btn btn-danger btn-sm"
                      >
                        <Lock size={16} />
                        <span>Close Shift</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Register is currently locked. Enter an opening cash float to initialize shift transactions.
                    </p>

                    <button
                      onClick={() => {
                        setTargetRegisterId(reg.id);
                        setOpenModalVisible(true);
                      }}
                      className="btn btn-primary"
                    >
                      <Unlock size={18} />
                      <span>Open Shift with Cash Float</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Open Shift Modal */}
      <Modal isOpen={openModalVisible} onClose={() => setOpenModalVisible(false)} title="Open Register Shift">
        <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Opening Cash Float ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>

          <div
            style={{
              padding: 12,
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe',
              fontSize: '0.8rem',
              color: '#1e40af',
            }}
          >
            The starting cash float is recorded in the register drawer and used for physical shift variance auditing.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setOpenModalVisible(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Opening...' : 'Confirm Open Shift'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cash In / Out Movement Modal */}
      <Modal isOpen={movementModalVisible} onClose={() => setMovementModalVisible(false)} title="Record Cash Movement">
        <form onSubmit={handleRecordMovement} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Movement Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => setMovementType('cash_in')}
                className={`btn ${movementType === 'cash_in' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <ArrowDownCircle size={16} />
                <span>Cash In (Float Add)</span>
              </button>
              <button
                type="button"
                onClick={() => setMovementType('cash_out')}
                className={`btn ${movementType === 'cash_out' ? 'btn-danger' : 'btn-secondary'}`}
              >
                <ArrowUpCircle size={16} />
                <span>Cash Drop (Safe Transfer)</span>
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Audit Reason / Note
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Mid-day safe drop"
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setMovementModalVisible(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Recording...' : 'Record Cash Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Shift Modal */}
      <Modal isOpen={closeModalVisible} onClose={() => setCloseModalVisible(false)} title="Close Shift & Cash Audit">
        <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              padding: 14,
              background: '#fffbeb',
              borderRadius: '8px',
              border: '1px solid #fef3c7',
              fontSize: '0.85rem',
              color: '#92400e',
            }}
          >
            Count all physical currency, coins, and bills in the drawer. Enter the total cash count below.
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Physical Cash Count in Drawer ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              placeholder="0.00"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => setCloseModalVisible(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-danger">
              {submitting ? 'Auditing...' : 'Confirm Shift Closure'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
