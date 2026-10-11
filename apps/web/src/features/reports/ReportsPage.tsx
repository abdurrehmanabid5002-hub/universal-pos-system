import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  PieChart,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';

export const ReportsPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.businessId;

  const [salesReport, setSalesReport] = useState<any | null>(null);
  const [profitReport, setProfitReport] = useState<any | null>(null);
  const [invReport, setInvReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [s, p, i] = await Promise.all([
          api.getSalesReport(businessId),
          api.getProfitReport(businessId),
          api.getInventoryReport(businessId),
        ]);
        setSalesReport(s);
        setProfitReport(p);
        setInvReport(i);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [businessId]);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading executive financial reports...
      </div>
    );
  }

  const currency = activeBusiness?.defaultCurrency || 'PKR';

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Business Reports & Analytics</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Authoritative sales revenue, cost of goods sold (COGS), margins, and inventory valuation
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem' }}>Gross Revenue</span>
            <DollarSign size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8 }}>
            {profitReport?.revenue} {currency}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {salesReport?.totalSalesCount} completed orders
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem' }}>Gross Profit</span>
            <TrendingUp size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8, color: 'var(--success)' }}>
            {profitReport?.grossProfit} {currency}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Margin: <strong>{profitReport?.grossMarginPercentage}%</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem' }}>Operating Expenses</span>
            <ArrowUpRight size={18} color="var(--danger)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8, color: 'var(--danger)' }}>
            {profitReport?.operatingExpenses} {currency}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Recorded store costs
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem' }}>Net Operating Profit</span>
            <PieChart size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8, color: 'var(--info)' }}>
            {profitReport?.netProfit} {currency}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            After cost of goods & expenses
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.85rem' }}>Inventory Valuation (Cost)</span>
            <Package size={18} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 8 }}>
            {invReport?.valuationCost} {currency}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {invReport?.totalUnits} units on hand
          </div>
        </div>
      </div>

      {/* Two-Column Deep Dive */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Top Selling Products */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>
            Top Selling Products by Volume
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Qty Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {salesReport?.topSellingItems?.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                      No sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  salesReport?.topSellingItems?.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{it.product_name_snapshot}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{it.sku_snapshot}</td>
                      <td style={{ fontWeight: 700 }}>{parseFloat(it.quantity_sold).toFixed(0)}</td>
                      <td>{parseFloat(it.total_revenue).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="var(--warning)" /> Low Stock Watchlist (&le; 10 units)
          </h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invReport?.lowStockItems?.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                      All items have healthy inventory levels (&gt; 10 units).
                    </td>
                  </tr>
                ) : (
                  invReport?.lowStockItems?.map((it: any) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600 }}>{it.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{it.sku}</td>
                      <td style={{ fontWeight: 700 }}>
                        {parseFloat(it.quantity_on_hand).toFixed(0)} units
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            parseFloat(it.quantity_on_hand) <= 0
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {parseFloat(it.quantity_on_hand) <= 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
