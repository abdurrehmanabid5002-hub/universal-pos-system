import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  CheckCircle,
  PackagePlus,
  Building,
  Phone,
  Mail,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const PurchasingPage: React.FC = () => {
  const { activeBusiness, activeBranch } = useAuth();
  const businessId = activeBusiness?.businessId;
  const currency = activeBusiness?.defaultCurrency || 'PKR';

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierCode, setSupplierCode] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [contactName, setContactName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [receiveQty, setReceiveQty] = useState('50');
  const [unitCost, setUnitCost] = useState('100.00');
  const [notes, setNotes] = useState('Shipment restock');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!businessId) return;
    try {
      const [supRes, locRes, prodRes] = await Promise.all([
        api.getSuppliers(businessId),
        api.getInventoryLocations(businessId),
        api.getProducts(businessId, { limit: 100 }),
      ]);
      setSuppliers(supRes || []);
      setLocations(locRes || []);
      setProducts(prodRes?.items || []);
      if (supRes && supRes.length > 0 && !selectedSupplier) setSelectedSupplier(supRes[0].id);
      if (locRes && locRes.length > 0 && !selectedLocation) setSelectedLocation(locRes[0].id);
      if (prodRes?.items?.length > 0 && !selectedProduct) setSelectedProduct(prodRes.items[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !supplierName.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.createSupplier(businessId, {
        supplierCode: supplierCode.trim() || `SUP-${Date.now().toString().slice(-4)}`,
        name: supplierName.trim(),
        contactName: contactName.trim() || undefined,
        phone: supplierPhone.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Supplier "${supplierName}" created successfully!` });
      setSupplierModalOpen(false);
      setSupplierCode('');
      setSupplierName('');
      setContactName('');
      setSupplierPhone('');
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create supplier.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !selectedLocation || !selectedProduct) return;
    setLoading(true);
    setMessage(null);

    try {
      await api.receiveGoods(businessId, {
        supplierId: selectedSupplier || undefined,
        locationId: selectedLocation,
        items: [
          {
            productId: selectedProduct,
            quantity: receiveQty,
            unitCost,
          },
        ],
        notes,
      });

      setMessage({
        type: 'success',
        text: `Successfully received ${receiveQty} units into inventory! Stock ledger updated.`,
      });
      setReceiveModalOpen(false);
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to receive goods.' });
    } finally {
      setLoading(false);
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
            Purchasing & Goods Receiving
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Supplier directory, restock shipments, and inbound stockroom intake
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setSupplierModalOpen(true)} className="btn btn-secondary">
            <Plus size={16} />
            <span>+ Supplier</span>
          </button>
          <button onClick={() => setReceiveModalOpen(true)} className="btn btn-primary">
            <PackagePlus size={18} />
            <span>Receive Goods (Intake)</span>
          </button>
        </div>
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

      {/* Suppliers Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Supplier Code</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                  No suppliers found. Click "+ Supplier" to add vendor accounts.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        className="user-avatar"
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 700,
                        }}
                      >
                        <Building size={16} />
                      </div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.name}</div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2563eb' }}>
                      {s.supplier_code}
                    </span>
                  </td>
                  <td>{s.contact_name || 'Primary Rep'}</td>
                  <td>{s.phone || '-'}</td>
                  <td>
                    <span className="badge badge-cashier">{s.status || 'Active'}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Receive Goods Intake Modal */}
      <Modal isOpen={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} title="Receive Goods into Inventory">
        <form onSubmit={handleReceiveGoods} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Supplier / Vendor
            </label>
            <select
              className="input-field"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="">Select Vendor (Optional)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.supplier_code})
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
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Catalog Product *
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Quantity Received *
              </label>
              <input
                type="number"
                min="1"
                required
                className="input-field"
                value={receiveQty}
                onChange={(e) => setReceiveQty(e.target.value)}
                style={{ fontSize: '1.2rem', fontWeight: 700 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Unit Cost ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="input-field"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Receiving Notes / PO Number
            </label>
            <input
              type="text"
              className="input-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => setReceiveModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Receiving...' : 'Confirm Goods Intake'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal isOpen={supplierModalOpen} onClose={() => setSupplierModalOpen(false)} title="Register Supplier">
        <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Supplier / Company Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. National Foods Dist."
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Supplier Code
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. SUP-101"
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Contact Person
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Tariq Khan"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. +92 321 9876543"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => setSupplierModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Saving...' : 'Save Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
