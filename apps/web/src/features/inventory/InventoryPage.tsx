import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowUpDown,
  History,
  CheckCheck,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const InventoryPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.businessId;

  const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');
  const [balances, setBalances] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Adjustment modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [qtyChange, setQtyChange] = useState('');
  const [reason, setReason] = useState('Stock count discrepancy');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!businessId) return;
    try {
      const [balRes, locRes, prodRes] = await Promise.all([
        api.getInventoryBalances(businessId),
        api.getInventoryLocations(businessId),
        api.getProducts(businessId, { limit: 100 }),
      ]);
      setBalances(balRes || []);
      setLocations(locRes || []);
      setProducts(prodRes?.items || []);
      if (locRes && locRes.length > 0 && !selectedLocation) {
        setSelectedLocation(locRes[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMovements = async () => {
    if (!businessId) return;
    try {
      const movRes = await api.getInventoryMovements(businessId);
      setMovements(movRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    if (activeTab === 'movements') {
      loadMovements();
    }
  }, [businessId, activeTab]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !selectedProduct || !selectedLocation) return;
    setAdjustLoading(true);
    setMessage(null);
    try {
      await api.adjustStock(businessId, {
        productId: selectedProduct,
        locationId: selectedLocation,
        quantityChange: qtyChange,
        reason,
      });
      setMessage({ type: 'success', text: `Stock adjustment of ${qtyChange} units committed to immutable ledger!` });
      setAdjustModalOpen(false);
      setQtyChange('');
      await loadData();
      if (activeTab === 'movements') await loadMovements();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Stock adjustment failed.' });
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleReconcile = async (productId: string, locationId: string) => {
    if (!businessId) return;
    try {
      const rec = await api.reconcileInventory(businessId, { productId, locationId });
      setMessage({
        type: 'success',
        text: `Ledger Reconciled: Projected balance (${rec.projectedBalance}) verified against ledger sum (${rec.calculatedFromMovements})!`,
      });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Reconciliation failed.' });
    }
  };

  const filteredBalances = balances.filter((b) => {
    const q = search.toLowerCase();
    return b.product_name?.toLowerCase().includes(q) || b.sku?.toLowerCase().includes(q);
  });

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
            Inventory Ledger & Stockrooms
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Append-only movement transactions, multi-warehouse stockrooms, and balance verification
          </p>
        </div>

        <button
          onClick={() => {
            if (products.length > 0 && !selectedProduct) setSelectedProduct(products[0].id);
            setAdjustModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <ArrowUpDown size={18} />
          <span>+ Stock Adjustment</span>
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

      {/* Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setActiveTab('balances')}
            className={`btn btn-sm ${activeTab === 'balances' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Layers size={15} />
            <span>Stock Balances ({balances.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`btn btn-sm ${activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <History size={15} />
            <span>Immutable Ledger ({movements.length})</span>
          </button>
        </div>

        {activeTab === 'balances' && (
          <div style={{ position: 'relative', width: 280 }}>
            <Search
              size={17}
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
              placeholder="Search product or SKU..."
              className="input-field"
              style={{ paddingLeft: 38, height: 36, fontSize: '0.8rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {activeTab === 'balances' ? (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Location</th>
                <th>Branch</th>
                <th>Quantity on Hand</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                    No stock balances recorded.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((b) => {
                  const qty = parseFloat(b.on_hand || '0');
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{b.product_name}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2563eb' }}>
                          {b.sku}
                        </span>
                      </td>
                      <td>{b.location_name}</td>
                      <td>{b.branch_name}</td>
                      <td>
                        <span
                          className={`badge ${
                            qty <= 0
                              ? 'badge-support'
                              : qty < 10
                              ? 'badge-inventory'
                              : 'badge-cashier'
                          }`}
                        >
                          {qty.toFixed(0)} units
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleReconcile(b.product_id, b.location_id)}
                          className="btn btn-secondary btn-sm"
                          title="Verify projection against ledger"
                        >
                          <CheckCheck size={14} color="#16a34a" />
                          <span>Reconcile</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Delta</th>
                <th>Cost Snapshot</th>
                <th>Reference</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                    No ledger movement records found.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const delta = parseFloat(m.quantity_delta || '0');
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.product_name || m.product_id.substring(0, 8)}</td>
                      <td>
                        <span
                          className={`badge ${
                            m.movement_type === 'sale'
                              ? 'badge-support'
                              : m.movement_type === 'purchase_receive'
                              ? 'badge-cashier'
                              : m.movement_type === 'return'
                              ? 'badge-manager'
                              : 'badge-inventory'
                          }`}
                        >
                          {m.movement_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: delta > 0 ? '#15803d' : '#b91c1c' }}>
                        {delta > 0 ? `+${delta.toFixed(0)}` : delta.toFixed(0)}
                      </td>
                      <td>{parseFloat(m.cost_price_snapshot || '0').toFixed(2)}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {m.reference_type || 'system'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <Modal isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Audit Stock Adjustment">
        <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Select Catalog Product *
            </label>
            <select
              className="input-field"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Target Stock Location *
            </label>
            <select
              className="input-field"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              required
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.branch_name || 'Main'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Quantity Delta (+ to add, - to subtract) *
            </label>
            <input
              type="number"
              step="1"
              required
              className="input-field"
              placeholder="e.g. +10 or -3"
              value={qtyChange}
              onChange={(e) => setQtyChange(e.target.value)}
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Audit Reason *
            </label>
            <select
              className="input-field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="Stock count discrepancy">Physical stock count discrepancy</option>
              <option value="Damaged goods write-off">Damaged goods write-off</option>
              <option value="Expired batch removal">Expired batch removal</option>
              <option value="Promotional sample distribution">Promotional sample distribution</option>
              <option value="Manual stock correction">Manual stock correction</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={() => setAdjustModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={adjustLoading} className="btn btn-primary">
              {adjustLoading ? 'Committing...' : 'Commit Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
