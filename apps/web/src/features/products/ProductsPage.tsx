import React, { useState, useEffect } from 'react';
import { Plus, Search, Barcode, Tag, Package, Layers, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../app/providers';
import { api } from '../../services/api';
import { Modal } from '../../components/ui/Modal';

export const ProductsPage: React.FC = () => {
  const { activeBusiness } = useAuth();
  const businessId = activeBusiness?.businessId;
  const currency = activeBusiness?.defaultCurrency || 'PKR';

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  // New product form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [costPrice, setCostPrice] = useState('100.00');
  const [sellingPrice, setSellingPrice] = useState('150.00');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);

  // New category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (!businessId) return;
    try {
      const [pRes, cRes] = await Promise.all([
        api.getProducts(businessId, { search, categoryId: selectedCategory !== 'all' ? selectedCategory : undefined }),
        api.getCategories(businessId),
      ]);
      setProducts(pRes?.items || []);
      setCategories(cRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId, search, selectedCategory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.createProduct(businessId, {
        name,
        sku,
        categoryId: categoryId || undefined,
        costPrice,
        sellingPrice,
        barcodes: barcode ? [barcode] : [],
      });
      setMessage({ type: 'success', text: `Product "${name}" created successfully!` });
      setModalOpen(false);
      setName('');
      setSku('');
      setBarcode('');
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to create product.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !newCatName.trim()) return;
    try {
      await api.createCategory(businessId, {
        name: newCatName.trim(),
        description: newCatDesc.trim(),
      });
      setMessage({ type: 'success', text: `Category "${newCatName}" added successfully!` });
      setNewCatName('');
      setNewCatDesc('');
      setCategoryModalOpen(false);
      await loadData();
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to create category.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
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
            Products & Catalog
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>
            Manage catalog items, barcodes, cost, selling price, and stock track rules
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setCategoryModalOpen(true)} className="btn btn-secondary">
            <Tag size={16} />
            <span>+ Category</span>
          </button>
          <button onClick={() => setModalOpen(true)} className="btn btn-primary">
            <Plus size={18} />
            <span>+ Add Product</span>
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

      {/* Filter toolbar */}
      <div
        className="pos-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 600 }}>
          <div style={{ position: 'relative', width: 320 }}>
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
              placeholder="Search by name, SKU or barcode..."
              style={{ paddingLeft: 38 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input-field"
            style={{ width: 'auto' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
          Total Products: <strong style={{ color: '#0f172a' }}>{products.length}</strong>
        </div>
      </div>

      {/* Data Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Barcodes</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Stock Status</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  No products found. Click "+ Add Product" to create your first item.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const stock = parseFloat(p.total_stock || '0');
                return (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2563eb' }}>
                        {p.sku}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                    </td>
                    <td>
                      <span className="badge badge-sales">{p.category_name || 'General'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {p.barcodes && p.barcodes.length > 0 ? (
                          p.barcodes.map((bc: string) => (
                            <span
                              key={bc}
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: 4,
                                color: '#334155',
                              }}
                            >
                              {bc}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>None</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {currency} {parseFloat(p.cost_price || '0').toFixed(2)}
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>
                        {currency} {parseFloat(p.selling_price || '0').toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          stock <= 0
                            ? 'badge-support'
                            : stock < 10
                            ? 'badge-inventory'
                            : 'badge-cashier'
                        }`}
                      >
                        {stock <= 0 ? 'Out of Stock' : `${stock.toFixed(0)} in stock`}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Product Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Product to Catalog">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Product Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Organic Whole Milk 1L"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                SKU (Stock Keeping Unit) *
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="MILK-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Category
              </label>
              <select
                className="input-field"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Cost Price ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="input-field"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Retail Selling Price ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="input-field"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Barcode (EAN-13, UPC, Code128)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 8901234567890"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Category Modal */}
      <Modal isOpen={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} title="Add Product Category">
        <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Category Name *
            </label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Beverages & Juices"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Description
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Cold sodas, bottled waters and juices"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => setCategoryModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
