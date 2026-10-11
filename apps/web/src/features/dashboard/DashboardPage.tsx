import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  ChevronRight,
  Plus,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';

export const DashboardPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.businessId;
  const currency = activeBusiness?.defaultCurrency || 'PKR';

  const [salesReport, setSalesReport] = useState<any | null>(null);
  const [profitReport, setProfitReport] = useState<any | null>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [inventoryBalances, setInventoryBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [salesRep, profitRep, salesList, balances] = await Promise.all([
          api.getSalesReport(businessId).catch(() => null),
          api.getProfitReport(businessId).catch(() => null),
          api.getSales(businessId).catch(() => []),
          api.getInventoryBalances(businessId).catch(() => []),
        ]);

        setSalesReport(salesRep);
        setProfitReport(profitRep);
        setRecentSales(salesList?.slice(0, 6) || []);
        setInventoryBalances(balances || []);
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [businessId]);

  const totalGrossSales = parseFloat(salesReport?.summary?.grossSales || '0');
  const totalSalesCount = parseInt(salesReport?.summary?.totalSalesCount || '0', 10);
  const grossProfit = parseFloat(profitReport?.summary?.grossProfit || '0');
  const grossMarginPct = parseFloat(profitReport?.summary?.grossMarginPct || '0');
  const lowStockItems = inventoryBalances.filter((b) => parseFloat(b.on_hand || '0') <= 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Top Banner & Quick Launch */}
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
            Store Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Real-time sales throughput, inventory health, and register performance
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/pos" className="btn btn-primary" style={{ boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
            <ShoppingCart size={18} />
            <span>Launch POS Terminal</span>
          </Link>
          <Link to="/products" className="btn btn-secondary">
            <Plus size={18} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        {/* Gross Sales */}
        <div className="pos-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Gross Sales</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 12 }}>
            {currency} {totalGrossSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: '#10b981' }}>
            <ArrowUpRight size={16} />
            <span>Audited transactional revenue</span>
          </div>
        </div>

        {/* Total Orders Completed */}
        <div className="pos-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Orders Completed</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingCart size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 12 }}>
            {totalSalesCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: '#64748b' }}>
            <Clock size={15} />
            <span>Settled register transactions</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="pos-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Gross Profit</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: '#faf5ff',
                color: '#9333ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 12 }}>
            {currency} {grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: '#9333ea' }}>
            <span>Margin: {grossMarginPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Stock Alert */}
        <div className="pos-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Low Stock Alert</span>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: '#fffbeb',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: lowStockItems.length > 0 ? '#d97706' : '#0f172a', marginTop: 12 }}>
            {lowStockItems.length} items
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.8rem', color: '#d97706' }}>
            <span>{lowStockItems.length > 0 ? 'Requires stock purchase' : 'Stock levels optimal'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Sales & Stock Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24, alignItems: 'start' }}>
        {/* Recent Transactions */}
        <div className="pos-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Recent Sales Transactions</h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Latest orders completed across all registers</p>
            </div>
            <Link to="/sales" className="btn btn-ghost btn-sm" style={{ color: '#2563eb', fontWeight: 600 }}>
              <span>View All</span>
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                      No sales recorded yet. Click "Launch POS Terminal" to make your first sale!
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                        {sale.receipt_number || sale.id.substring(0, 8)}
                      </td>
                      <td>{sale.customer_name || 'Walk-in Customer'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {currency} {parseFloat(sale.grand_total || '0').toFixed(2)}
                      </td>
                      <td>
                        <span className="badge badge-cashier">
                          {sale.status || 'Completed'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(sale.completed_at || sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Stock Warning & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Low Stock Warning Box */}
          <div className="pos-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#d97706" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Low Stock Watch</h3>
              </div>
              <Link to="/inventory" className="btn btn-ghost btn-sm" style={{ color: '#2563eb' }}>
                Inventory
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStockItems.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  All items are safely above minimum thresholds.
                </div>
              ) : (
                lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#fffbeb',
                      borderRadius: '8px',
                      border: '1px solid #fef3c7',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#92400e' }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#b45309' }}>SKU: {item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#b45309' }}>
                        {parseFloat(item.on_hand).toFixed(0)} units
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#d97706' }}>In {item.location_name}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Operations Box */}
          <div className="pos-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
              Quick Operations
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Link
                to="/purchasing"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '12px 14px' }}
              >
                <Truck size={18} color="#2563eb" />
                <span>Receive Stock</span>
              </Link>

              <Link
                to="/registers"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '12px 14px' }}
              >
                <Layers size={18} color="#16a34a" />
                <span>Cash Register</span>
              </Link>

              <Link
                to="/expenses"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '12px 14px' }}
              >
                <DollarSign size={18} color="#d97706" />
                <span>Record Expense</span>
              </Link>

              <Link
                to="/reports"
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '12px 14px' }}
              >
                <TrendingUp size={18} color="#9333ea" />
                <span>Profit Report</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
