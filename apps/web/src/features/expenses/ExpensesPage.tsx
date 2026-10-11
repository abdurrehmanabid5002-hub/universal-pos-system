import React, { useState, useEffect } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const ExpensesPage: React.FC = () => {
  const { activeBusiness, activeBranch } = useAuth();
  const businessId = activeBusiness?.businessId;

  const [expenses, setExpenses] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState('Utilities');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const loadExpenses = async () => {
    if (!businessId) return;
    try {
      const data = await api.getExpenses(businessId);
      setExpenses(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [businessId]);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !activeBranch?.id) return;
    setLoading(true);
    try {
      await api.recordExpense(businessId, {
        branchId: activeBranch.id,
        category,
        description,
        amount,
        currency: activeBusiness?.defaultCurrency || 'PKR',
      });
      setModalOpen(false);
      setDescription('');
      setAmount('');
      await loadExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Store Operating Expenses</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Track store operating costs, utilities, rent, and petty cash expenditures
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> Record Expense
        </button>
      </div>

      <div className="data-table-container glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Branch</th>
              <th>Recorded By</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  No expenses recorded.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontSize: '0.85rem' }}>{exp.expense_date}</td>
                  <td>
                    <span className="badge badge-info">{exp.category}</span>
                  </td>
                  <td>{exp.description}</td>
                  <td>{exp.branch_name}</td>
                  <td>{exp.created_by_name}</td>
                  <td style={{ fontWeight: 800, color: 'var(--danger)' }}>
                    -{parseFloat(exp.amount).toFixed(2)} {exp.currency}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Store Expense">
        <form onSubmit={handleRecord} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: 6 }}>
              Category
            </label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Utilities">Utilities (Electricity, Water, Internet)</option>
              <option value="Rent">Store Lease / Rent</option>
              <option value="Packaging">Bags & Packaging Materials</option>
              <option value="Maintenance">Equipment Repairs & Cleaning</option>
              <option value="Staff Refreshments">Staff Meals / Tea</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: 6 }}>
              Description
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Monthly electricity bill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: 6 }}>
              Amount ({activeBusiness?.defaultCurrency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              placeholder="1500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 8 }}
          >
            {loading ? 'Recording...' : 'Save Expense'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
