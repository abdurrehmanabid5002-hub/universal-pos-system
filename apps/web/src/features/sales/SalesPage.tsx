import React, { useState, useEffect } from 'react';
import {
  History,
  Eye,
  RotateCcw,
  CheckCircle,
  Printer,
  Search,
  AlertCircle,
  ArrowDownLeft,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const SalesPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.businessId;
  const currency = activeBusiness?.defaultCurrency || 'PKR';

  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [saleDetailOpen, setSaleDetailOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Return dialog state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnItem, setReturnItem] = useState<any | null>(null);
  const [returnQty, setReturnQty] = useState('1');
  const [restockStock, setRestockStock] = useState(true);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'card'>('cash');
  const [returnReason, setReturnReason] = useState('Customer returned item');
  const [returnLoading, setReturnLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSales = async () => {
    if (!businessId) return;
    try {
      const data = await api.getSales(businessId);
      setSales(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSales();
  }, [businessId]);

  const handleViewDetail = async (saleId: string) => {
    if (!businessId) return;
    try {
      const detail = await api.getSaleById(businessId, saleId);
      setSelectedSale(detail);
      setSaleDetailOpen(true);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to load sale detail.' });
    }
  };

  const openReturnModal = (item: any) => {
    setReturnItem(item);
    setReturnQty('1');
    setReturnModalOpen(true);
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !selectedSale || !returnItem) return;
    setReturnLoading(true);
    setMessage(null);

    try {
      await api.processReturn(businessId, {
        originalSaleId: selectedSale.id,
        reason: returnReason,
        refundMethod,
        items: [
          {
            originalSaleItemId: returnItem.id,
            quantity: returnQty,
            restock: restockStock,
          },
        ],
      });

      setMessage({ type: 'success', text: `Return processed! Restocked ${returnQty} unit(s) and issued refund.` });
      setReturnModalOpen(false);
      setSaleDetailOpen(false);
      await loadSales();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Return processing failed.' });
    } finally {
      setReturnLoading(false);
    }
  };

  const filteredSales = sales.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.receipt_number?.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q) ||
      s.id?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Sales History & Customer Returns
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
          Search historical receipts, inspect line-item snapshots, and process authorized refunds
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

      {/* Filter bar */}
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
            className="input-field"
            placeholder="Search by receipt # or customer..."
            style={{ paddingLeft: 38 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          Total Completed Sales: <strong style={{ color: '#0f172a' }}>{sales.length}</strong>
        </div>
      </div>

      {/* Sales Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Receipt Number</th>
              <th>Customer</th>
              <th>Subtotal</th>
              <th>Discount</th>
              <th>Grand Total</th>
              <th>Payment</th>
              <th>Date & Time</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  No sale records found. Complete orders in POS Checkout to generate receipts.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>
                      {sale.receipt_number || sale.id.substring(0, 8)}
                    </span>
                  </td>
                  <td>{sale.customer_name || 'Walk-in Customer'}</td>
                  <td>{currency} {parseFloat(sale.subtotal || '0').toFixed(2)}</td>
                  <td>
                    {parseFloat(sale.discount_total || '0') > 0 ? (
                      <span style={{ color: '#15803d', fontWeight: 600 }}>
                        -{currency} {parseFloat(sale.discount_total || '0').toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: '#0f172a' }}>
                      {currency} {parseFloat(sale.grand_total || '0').toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    <span className="badge badge-cashier">
                      {sale.status || 'Paid (Cash)'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {new Date(sale.completed_at || sale.created_at).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleViewDetail(sale.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Eye size={14} />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sale Detail & Printable Receipt Modal */}
      <Modal
        isOpen={saleDetailOpen}
        onClose={() => setSaleDetailOpen(false)}
        title={`Receipt #${selectedSale?.receipt_number || 'Details'}`}
        maxWidth="640px"
      >
        {selectedSale && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Visual thermal printable receipt preview */}
            <div
              className="printable-receipt"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: 24,
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{activeBusiness?.businessName}</div>
                <div>Branch: {selectedSale.branch_name || 'Main Branch'}</div>
                <div>Receipt: {selectedSale.receipt_number}</div>
                <div>Date: {new Date(selectedSale.completed_at || selectedSale.created_at).toLocaleString()}</div>
                <div>Cashier: {selectedSale.cashier_name || 'Staff'}</div>
                <div>Customer: {selectedSale.customer_name || 'Walk-in Customer'}</div>
              </div>

              {/* Items breakdown */}
              <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '10px 0', margin: '10px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 70px', fontWeight: 'bold' }}>
                  <span>Item</span>
                  <span style={{ textAlign: 'center' }}>Qty</span>
                  <span style={{ textAlign: 'right' }}>Price</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>

                {(selectedSale.items || []).map((it: any) => (
                  <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 70px', marginTop: 6, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>SKU: {it.sku}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>{it.quantity}</div>
                    <div style={{ textAlign: 'right' }}>{parseFloat(it.unit_price).toFixed(2)}</div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>{parseFloat(it.line_total).toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{currency} {parseFloat(selectedSale.subtotal || '0').toFixed(2)}</span>
                </div>
                {parseFloat(selectedSale.discount_total || '0') > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discounts:</span>
                    <span>-{currency} {parseFloat(selectedSale.discount_total || '0').toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', marginTop: 4 }}>
                  <span>GRAND TOTAL:</span>
                  <span>{currency} {parseFloat(selectedSale.grand_total || '0').toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span>Paid:</span>
                  <span>{currency} {parseFloat(selectedSale.amount_paid || selectedSale.grand_total || '0').toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Change:</span>
                  <span>{currency} {parseFloat(selectedSale.change_due || '0').toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Return Item selection trigger */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                Items Eligible for Return / Restock
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selectedSale.items || []).map((it: any) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{it.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Purchased: {it.quantity} units</div>
                    </div>
                    <button
                      onClick={() => openReturnModal(it)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#b91c1c' }}
                    >
                      <RotateCcw size={14} />
                      <span>Return Item</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => window.print()} className="btn btn-primary">
                <Printer size={16} />
                <span>Print Thermal Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return & Refund Modal */}
      <Modal isOpen={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="Process Return & Refund">
        {returnItem && (
          <form onSubmit={handleProcessReturn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 12, background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{returnItem.product_name}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Unit price: {currency} {parseFloat(returnItem.unit_price).toFixed(2)}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Return Quantity (Max: {returnItem.quantity}) *
              </label>
              <input
                type="number"
                min="1"
                max={returnItem.quantity}
                required
                className="input-field"
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Refund Payment Method *
              </label>
              <select
                className="input-field"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
              >
                <option value="cash">Cash Refund</option>
                <option value="card">Card / Electronic Refund</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Reason for Return *
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="e.g. Defective or customer change of mind"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="restock-cb"
                checked={restockStock}
                onChange={(e) => setRestockStock(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#2563eb' }}
              />
              <label htmlFor="restock-cb" style={{ fontSize: '0.85rem', fontWeight: 500, color: '#0f172a' }}>
                Restock item back into stockroom inventory
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <button type="button" onClick={() => setReturnModalOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={returnLoading} className="btn btn-danger">
                {returnLoading ? 'Processing...' : 'Authorize Return & Issue Refund'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
