import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Printer,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  CreditCard,
  User,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

interface CartItem {
  product: any;
  quantity: number;
  discount: number; // percentage or fixed
}

export const PosPage: React.FC = () => {
  const { activeBusiness, activeBranch, activeRegister } = useAuth();
  const businessId = activeBusiness?.businessId;
  const currency = activeBusiness?.defaultCurrency || 'PKR';

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');

  // Register session state
  const [session, setSession] = useState<any | null>(null);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState('1000.00');
  const [closingCashInput, setClosingCashInput] = useState('');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);

  // Payment tender modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Completed sale receipt modal
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadCatalog = async () => {
    if (!businessId) return;
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        api.getProducts(businessId, { limit: 150 }).catch(() => null),
        api.getCategories(businessId).catch(() => []),
        api.getCustomers(businessId).catch(() => []),
      ]);
      setProducts(prodRes?.items || []);
      setCategories(catRes || []);
      setCustomers(custRes || []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    }
  };

  const loadSession = async () => {
    if (!businessId || !activeRegister?.id) return;
    try {
      const sess = await api.getCurrentSession(businessId, activeRegister.id);
      setSession(sess);
    } catch {
      setSession(null);
    }
  };

  useEffect(() => {
    loadCatalog();
    loadSession();
  }, [businessId, activeRegister]);

  // Barcode rapid scan handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeQuery.trim() || !businessId) return;

    try {
      const prod = await api.lookupBarcode(businessId, barcodeQuery.trim());
      if (prod) {
        addToCart(prod);
        setBarcodeQuery('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Product not found for barcode');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
    setSelectedCustomerId('');
  };

  // Authoritative price calculations
  const rawSubtotal = cart.reduce((acc, item) => {
    const unitPrice = parseFloat(item.product.selling_price || '0');
    return acc + unitPrice * item.quantity;
  }, 0);

  const cartDiscountAmount = (rawSubtotal * cartDiscount) / 100;
  const taxableTotal = Math.max(0, rawSubtotal - cartDiscountAmount);
  const taxAmount = 0; // Tax included or calculated server-side
  const grandTotal = taxableTotal + taxAmount;

  const changeDue = Math.max(
    0,
    parseFloat(amountTendered || '0') - grandTotal
  );

  const handleOpenTender = () => {
    if (cart.length === 0) return;
    setAmountTendered(grandTotal.toFixed(2));
    setPaymentModalVisible(true);
  };

  const handleCheckout = async () => {
    if (!businessId || !activeBranch?.id || !activeRegister?.id) {
      setErrorMsg('Branch or Register context missing.');
      return;
    }

    if (parseFloat(amountTendered || '0') < grandTotal) {
      setErrorMsg('Tendered cash is less than the total amount due.');
      return;
    }

    setCheckoutLoading(true);
    setErrorMsg(null);

    const idempotencyKey = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      const payload = {
        branchId: activeBranch.id,
        registerId: activeRegister.id,
        customerId: selectedCustomerId || undefined,
        currency,
        items: cart.map((it) => ({
          productId: it.product.id,
          quantity: it.quantity.toString(),
        })),
        discount:
          cartDiscount > 0
            ? { type: 'percentage', value: cartDiscount.toString() }
            : undefined,
        payments: [
          {
            method: paymentMethod,
            amount: parseFloat(amountTendered || grandTotal.toString()).toFixed(2),
          },
        ],
      };

      const result = await api.checkout(businessId, payload, idempotencyKey);
      setCompletedSale(result);
      setPaymentModalVisible(false);
      clearCart();
      await loadCatalog(); // Refresh stock balances
      await loadSession(); // Refresh register cash
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Register Session handlers
  const handleOpenRegister = async () => {
    if (!businessId || !activeRegister?.id) return;
    try {
      await api.openSession(businessId, {
        registerId: activeRegister.id,
        openingCash: openingCashInput,
      });
      setOpenModalVisible(false);
      await loadSession();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to open register.');
    }
  };

  const handleCloseRegister = async () => {
    if (!businessId || !session?.id) return;
    try {
      await api.closeSession(businessId, session.id, {
        closingCash: closingCashInput,
      });
      setCloseModalVisible(false);
      await loadSession();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to close register.');
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Shift status notification bar */}
      <div
        className="pos-card"
        style={{
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {session ? (
            <span className="badge badge-cashier">
              <Unlock size={14} /> Shift Open
            </span>
          ) : (
            <span className="badge badge-support">
              <Lock size={14} /> Shift Closed
            </span>
          )}

          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Register: <strong style={{ color: '#0f172a' }}>{activeRegister?.name || 'REG-01'}</strong>
          </span>

          {session && (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Drawer Float:{' '}
              <strong style={{ color: '#16a34a' }}>
                {currency} {parseFloat(session.expectedCash || session.opening_cash || '0').toFixed(2)}
              </strong>
            </span>
          )}
        </div>

        <div>
          {session ? (
            <button
              onClick={() => {
                setClosingCashInput(parseFloat(session.expectedCash || '0').toFixed(2));
                setCloseModalVisible(true);
              }}
              className="btn btn-secondary btn-sm"
            >
              Close Shift
            </button>
          ) : (
            <button
              onClick={() => setOpenModalVisible(true)}
              className="btn btn-primary btn-sm"
            >
              Open Shift (Float)
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main POS Interface: Split grid (Products Left / Cart Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 420px',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left: Product Catalog, Search & Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top search & barcode scanner inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            {/* Barcode scanner input */}
            <form onSubmit={handleBarcodeSubmit} style={{ position: 'relative' }}>
              <Barcode
                size={18}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#2563eb',
                }}
              />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan or enter barcode (Press Enter)..."
                className="input-field"
                style={{ paddingLeft: 38 }}
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
              />
            </form>

            {/* Keyword search input */}
            <div style={{ position: 'relative' }}>
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
                placeholder="Search products by name or SKU..."
                className="input-field"
                style={{ paddingLeft: 38 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`btn btn-sm ${
                selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`btn btn-sm ${
                  selectedCategory === c.id ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 16,
            }}
          >
            {filteredProducts.map((p) => {
              const stock = parseFloat(p.total_stock || '0');
              const isOutOfStock = p.tracks_inventory && stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className="pos-card pos-card-hover"
                  style={{
                    padding: 16,
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.6 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 140,
                    userSelect: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      {p.sku}
                    </div>
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginTop: 4,
                        lineHeight: 1.3,
                      }}
                    >
                      {p.name}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      marginTop: 14,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          color: '#2563eb',
                        }}
                      >
                        {parseFloat(p.selling_price).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {currency}
                      </div>
                    </div>

                    {p.tracks_inventory && (
                      <span
                        className={`badge ${
                          stock <= 0
                            ? 'badge-support'
                            : stock < 10
                            ? 'badge-inventory'
                            : 'badge-cashier'
                        }`}
                      >
                        {stock <= 0 ? 'Out of Stock' : `${stock} in stock`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Checkout Cart Panel */}
        <div
          className="pos-card"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 120px)',
            position: 'sticky',
            top: 84,
            background: '#ffffff',
          }}
        >
          {/* Cart Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Active Checkout Session
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444', padding: '4px 8px' }}
                title="Clear Cart"
              >
                <Trash2 size={16} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Customer Selector */}
          <div style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
              <User size={13} />
              <span>Customer</span>
            </label>
            <select
              className="input-field"
              style={{ fontSize: '0.85rem', padding: '6px 10px' }}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">Walk-in Customer (General)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Item List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {cart.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 12,
                  color: '#94a3b8',
                }}
              >
                <Barcode size={44} strokeWidth={1.5} color="#cbd5e1" />
                <div style={{ fontSize: '0.9rem', textAlign: 'center' }}>
                  Your cart is empty.<br />Click products on the left or scan a barcode.
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const unitPrice = parseFloat(item.product.selling_price || '0');
                const lineTotal = unitPrice * item.quantity;

                return (
                  <div
                    key={item.product.id}
                    style={{
                      padding: 12,
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                          {item.product.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {currency} {unitPrice.toFixed(2)} each
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {currency} {lineTotal.toFixed(2)}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', borderRadius: '4px' }}
                        >
                          <Minus size={14} />
                        </button>

                        <span
                          style={{
                            fontWeight: 700,
                            minWidth: 28,
                            textAlign: 'center',
                            fontSize: '0.9rem',
                            color: '#0f172a',
                          }}
                        >
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', borderRadius: '4px' }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444', padding: '4px 6px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Pricing Totals */}
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Discount selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Cart Discount:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 5, 10, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCartDiscount(d)}
                    className={`btn btn-sm ${
                      cartDiscount === d ? 'btn-primary' : 'btn-secondary'
                    }`}
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                  >
                    {d === 0 ? '0%' : `${d}%`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
              <span>Subtotal:</span>
              <span>{currency} {rawSubtotal.toFixed(2)}</span>
            </div>

            {cartDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a' }}>
                <span>Discount ({cartDiscount}%):</span>
                <span>-{currency} {cartDiscountAmount.toFixed(2)}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#0f172a',
                paddingTop: 8,
                borderTop: '1px dashed #e2e8f0',
              }}
            >
              <span>Total Due:</span>
              <span style={{ color: '#2563eb' }}>
                {currency} {grandTotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleOpenTender}
              disabled={cart.length === 0}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 8 }}
            >
              <CreditCard size={18} />
              <span>Pay {currency} {grandTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tender Payment Modal */}
      <Modal
        isOpen={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Complete Payment & Tender"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              padding: 16,
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
              Grand Total Amount Due
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e3a8a', marginTop: 4 }}>
              {currency} {grandTotal.toFixed(2)}
            </div>
          </div>

          {/* Payment Method tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`btn ${
                paymentMethod === 'cash' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <DollarSign size={18} />
              <span>Cash Payment</span>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`btn ${
                paymentMethod === 'card' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              <CreditCard size={18} />
              <span>Card / Electronic</span>
            </button>
          </div>

          {/* Tender Amount Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Cash Tendered ({currency})
            </label>
            <input
              type="number"
              className="input-field"
              value={amountTendered}
              onChange={(e) => setAmountTendered(e.target.value)}
              style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}
            />
          </div>

          {/* Quick Tender Buttons */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setAmountTendered(grandTotal.toFixed(2))}
            >
              Exact ({grandTotal.toFixed(2)})
            </button>
            {[100, 500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setAmountTendered(
                    (Math.ceil(grandTotal / amt) * amt || amt).toFixed(2)
                  )
                }
              >
                +{amt}
              </button>
            ))}
          </div>

          {/* Change Due Display */}
          <div
            style={{
              padding: '14px 18px',
              background: '#dcfce7',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600, color: '#166534' }}>Change Due to Customer</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>
              {currency} {changeDue.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={checkoutLoading || parseFloat(amountTendered || '0') < grandTotal}
            className="btn btn-success btn-lg"
            style={{ width: '100%' }}
          >
            {checkoutLoading ? 'Processing Checkout...' : 'Confirm Payment & Print Receipt'}
          </button>
        </div>
      </Modal>

      {/* Printable Thermal Receipt Modal */}
      <Modal
        isOpen={!!completedSale}
        onClose={() => setCompletedSale(null)}
        title="Sale Completed Successfully"
      >
        {completedSale && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Visual thermal printable receipt layout */}
            <div
              className="printable-receipt"
              style={{
                background: '#ffffff',
                color: '#000000',
                padding: 24,
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>
                  {activeBusiness?.businessName}
                </div>
                <div>{activeBranch?.name}</div>
                <div>Receipt: {completedSale.receiptNumber || completedSale.receipt_number}</div>
                <div>Date: {new Date(completedSale.completedAt || completedSale.created_at || Date.now()).toLocaleString()}</div>
              </div>

              <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', margin: '8px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', fontWeight: 'bold' }}>
                  <span>Item</span>
                  <span style={{ textAlign: 'center' }}>Qty</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>

                {(completedSale.items || []).map((it: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', marginTop: 4 }}>
                    <span>{it.productName || it.product_name}</span>
                    <span style={{ textAlign: 'center' }}>{it.quantity}</span>
                    <span style={{ textAlign: 'right' }}>
                      {parseFloat(it.lineTotal || it.line_total || '0').toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{currency} {parseFloat(completedSale.subtotal || '0').toFixed(2)}</span>
                </div>
                {parseFloat(completedSale.discountTotal || completedSale.discount_total || '0') > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount:</span>
                    <span>-{currency} {parseFloat(completedSale.discountTotal || completedSale.discount_total || '0').toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: 4 }}>
                  <span>TOTAL:</span>
                  <span>{currency} {parseFloat(completedSale.grandTotal || completedSale.grand_total || '0').toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span>Paid ({completedSale.paymentMethod || 'Cash'}):</span>
                  <span>{currency} {parseFloat(completedSale.amountPaid || completedSale.amount_paid || '0').toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Change:</span>
                  <span>{currency} {parseFloat(completedSale.changeDue || completedSale.change_due || '0').toFixed(2)}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: 16, fontSize: '11px' }}>
                Thank you for your purchase!
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                <Printer size={18} />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={() => setCompletedSale(null)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Plus size={18} />
                <span>New Sale</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Open Register Float Modal */}
      <Modal isOpen={openModalVisible} onClose={() => setOpenModalVisible(false)} title="Open Register Shift">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Opening Cash Float ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              value={openingCashInput}
              onChange={(e) => setOpeningCashInput(e.target.value)}
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setOpenModalVisible(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleOpenRegister} className="btn btn-primary">
              Confirm Open Float
            </button>
          </div>
        </div>
      </Modal>

      {/* Close Register Shift Modal */}
      <Modal isOpen={closeModalVisible} onClose={() => setCloseModalVisible(false)} title="Close Shift & Reconcile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Physical Cash Count in Drawer ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input-field"
              value={closingCashInput}
              onChange={(e) => setClosingCashInput(e.target.value)}
              style={{ fontSize: '1.2rem', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setCloseModalVisible(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleCloseRegister} className="btn btn-danger">
              Close Register Shift
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
