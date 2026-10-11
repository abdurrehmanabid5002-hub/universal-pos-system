const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { DatabaseService } = require('../dist/database/database.service');
const { AuthService } = require('../dist/modules/auth/auth.service');
const { BusinessesService } = require('../dist/modules/businesses/businesses.service');
const { ProductsService } = require('../dist/modules/products/products.service');
const { InventoryService } = require('../dist/modules/inventory/inventory.service');
const { PurchasingService } = require('../dist/modules/purchasing/purchasing.service');
const { RegistersService } = require('../dist/modules/registers/registers.service');
const { SalesService } = require('../dist/modules/sales/sales.service');
const { ReturnsService } = require('../dist/modules/returns/returns.service');
const { ReportsService } = require('../dist/modules/reports/reports.service');

test('Complete General Retail Operating Workflow E2E', async (t) => {
  const db = new DatabaseService();
  db.onModuleInit();

  const authService = new AuthService(db);
  const businessesService = new BusinessesService(db);
  const productsService = new ProductsService(db);
  const inventoryService = new InventoryService(db);
  const purchasingService = new PurchasingService(db);
  const registersService = new RegistersService(db);
  const salesService = new SalesService(db);
  const returnsService = new ReturnsService(db);
  const reportsService = new ReportsService(db);

  let userId, businessId, branchId, registerId, locationId, productId;
  let saleId, saleItemId;

  await t.test('1. Create user and business organization', async () => {
    const regRes = await authService.register({
      email: `retail_owner_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      fullName: 'Retail Manager',
      businessName: 'Super Fresh Mart',
    });

    assert.ok(regRes.user.id);
    assert.ok(regRes.business.id);
    assert.ok(regRes.token);

    userId = regRes.user.id;
    businessId = regRes.business.id;

    // Fetch branches and registers created automatically
    const branches = await businessesService.getBranches(businessId);
    assert.strictEqual(branches.length, 1);
    branchId = branches[0].id;

    const registers = await registersService.getRegisters(businessId, branchId);
    assert.strictEqual(registers.length, 1);
    registerId = registers[0].id;

    const locations = await inventoryService.getLocations(businessId, branchId);
    assert.strictEqual(locations.length, 1);
    locationId = locations[0].id;
  });

  await t.test('2. Add product with barcode and authoritative pricing', async () => {
    const barcode = `BARCODE-${Date.now()}`;
    const product = await productsService.createProduct(businessId, {
      name: 'Organic Honey 500g',
      sku: `HONEY-${Date.now().toString().slice(-4)}`,
      costPrice: '300.0000',
      sellingPrice: '450.0000',
      tracksInventory: true,
      barcodes: [barcode],
    });

    assert.ok(product.id);
    productId = product.id;

    // Verify lookup by barcode works
    const found = await productsService.lookupBarcode(businessId, barcode);
    assert.strictEqual(found.id, productId);
  });

  await t.test('3. Receive stock via goods receipt into stockroom', async () => {
    // Create supplier
    const supplier = await purchasingService.createSupplier(businessId, {
      supplierCode: `SUP-${Date.now().toString().slice(-4)}`,
      name: 'Bee Farms Ltd',
    });

    // Receive 20 units
    const grn = await purchasingService.receiveGoods(businessId, userId, {
      branchId,
      locationId,
      supplierId: supplier.id,
      items: [{ productId, quantity: '20.0000', unitCost: '300.0000' }],
    });

    assert.ok(grn.id);

    // Verify stock balance is now 20
    const balances = await inventoryService.getStockBalances(businessId, { productId, locationId });
    assert.strictEqual(balances.length, 1);
    assert.strictEqual(parseFloat(balances[0].quantity_on_hand), 20);
  });

  await t.test('4. Open register session with starting cash float', async () => {
    const session = await registersService.openSession(businessId, userId, {
      registerId,
      openingCash: '1000.0000',
    });

    assert.ok(session.id);
    assert.strictEqual(parseFloat(session.opening_cash), 1000);

    const activeSession = await registersService.getCurrentSession(businessId, registerId);
    assert.strictEqual(activeSession.id, session.id);
    assert.strictEqual(parseFloat(activeSession.expectedCash), 1000);
  });

  await t.test('5. Execute authoritative cash checkout (sell 3 units)', async () => {
    const idemKey = `sale_idem_${Date.now()}`;
    const saleResult = await salesService.checkout(businessId, userId, idemKey, {
      branchId,
      registerId,
      currency: 'PKR',
      items: [{ productId, quantity: '3.0000' }],
      payments: [{ method: 'cash', amount: '1500.0000' }],
    });

    assert.ok(saleResult.saleId);
    assert.strictEqual(saleResult.status, 'completed');
    // 3 * 450 = 1350 grand total, paid 1500 => change due 150
    assert.strictEqual(saleResult.grandTotal, '1350.00');
    assert.strictEqual(saleResult.amountPaid, '1500.00');
    assert.strictEqual(saleResult.changeDue, '150.00');

    saleId = saleResult.saleId;
    saleItemId = saleResult.items[0].productId; // Line item checked

    // Verify stock balance reduced from 20 to 17
    const balances = await inventoryService.getStockBalances(businessId, { productId, locationId });
    assert.strictEqual(parseFloat(balances[0].quantity_on_hand), 17);

    // Verify register session expected cash: 1000 float + 1350 net cash = 2350
    const activeSession = await registersService.getCurrentSession(businessId, registerId);
    assert.strictEqual(parseFloat(activeSession.expectedCash), 2350);
  });

  await t.test('6. Attempt overselling beyond stock limit -> must fail with INSUFFICIENT_STOCK', async () => {
    await assert.rejects(async () => {
      await salesService.checkout(businessId, userId, `oversell_${Date.now()}`, {
        branchId,
        registerId,
        currency: 'PKR',
        items: [{ productId, quantity: '50.0000' }], // Only 17 available
        payments: [{ method: 'cash', amount: '25000.00' }],
      });
    }, (err) => {
      assert.strictEqual(err.code, 'INSUFFICIENT_STOCK');
      return true;
    });
  });

  await t.test('7. Return 1 unit of product with restocking', async () => {
    const saleDetail = await salesService.getSaleById(businessId, saleId);
    const lineItem = saleDetail.items[0];

    const returnResult = await returnsService.processReturn(businessId, userId, {
      originalSaleId: saleId,
      reason: 'Wrong size selected',
      refundMethod: 'cash',
      items: [
        {
          originalSaleItemId: lineItem.id,
          quantity: '1.0000',
          restock: true,
        },
      ],
    });

    assert.ok(returnResult.returnId);
    assert.strictEqual(returnResult.refundTotal, '450.00');

    // Verify stock balance restored from 17 to 18
    const balances = await inventoryService.getStockBalances(businessId, { productId, locationId });
    assert.strictEqual(parseFloat(balances[0].quantity_on_hand), 18);

    // Register expected cash reduced by 450: 2350 - 450 = 1900
    const activeSession = await registersService.getCurrentSession(businessId, registerId);
    assert.strictEqual(parseFloat(activeSession.expectedCash), 1900);
  });

  await t.test('8. Attempt over-returning beyond purchased quantity -> must fail', async () => {
    const saleDetail = await salesService.getSaleById(businessId, saleId);
    const lineItem = saleDetail.items[0];

    await assert.rejects(async () => {
      await returnsService.processReturn(businessId, userId, {
        originalSaleId: saleId,
        reason: 'Over return attempt',
        refundMethod: 'cash',
        items: [
          {
            originalSaleItemId: lineItem.id,
            quantity: '5.0000', // Originally bought 3, returned 1, only 2 remaining
            restock: true,
          },
        ],
      });
    }, (err) => {
      assert.strictEqual(err.code, 'EXCEEDS_RETURNABLE_QUANTITY');
      return true;
    });
  });

  await t.test('9. Reconcile inventory movements against balance projection', async () => {
    const rec = await inventoryService.reconcileInventory(businessId, productId, locationId);
    assert.strictEqual(rec.isConsistent, true);
    assert.strictEqual(parseFloat(rec.calculatedFromMovements), 18);
    assert.strictEqual(parseFloat(rec.projectedBalance), 18);
  });

  await t.test('10. Close register session and verify cash reconciliation', async () => {
    const activeSession = await registersService.getCurrentSession(businessId, registerId);
    const closed = await registersService.closeSession(businessId, userId, activeSession.id, {
      closingCash: '1900.0000', // Exactly matching expected cash
    });

    assert.strictEqual(parseFloat(closed.closing_cash), 1900);
    assert.strictEqual(parseFloat(closed.expected_cash), 1900);
    assert.strictEqual(parseFloat(closed.variance), 0);
  });

  await t.test('11. Validate Profit and Inventory Reports', async () => {
    const profitReport = await reportsService.getProfitReport(businessId);
    assert.ok(parseFloat(profitReport.revenue) > 0);
    assert.ok(parseFloat(profitReport.cogs) > 0);
    assert.ok(parseFloat(profitReport.grossProfit) > 0);

    const invReport = await reportsService.getInventoryReport(businessId);
    assert.strictEqual(invReport.totalProducts, 1);
    assert.strictEqual(parseFloat(invReport.totalUnits), 18);
  });

  await db.onModuleDestroy();
});
