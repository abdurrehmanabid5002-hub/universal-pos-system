# Universal POS User Manual & Store Operations Guide

Welcome to Universal POS — the unified SaaS platform for modern store management.

---

## 1. Store Staff Workflows

### Opening a Register Shift
1. Navigate to the **POS Terminal** screen.
2. If the register session is closed, click **Open Register (Set Float)**.
3. Count the starting bills and coins in your cash drawer and enter the amount (e.g., `1000.00 PKR`).
4. Click **Confirm & Open Register**. Your register is now live and ready for checkout.

### Fast Product Barcode Scanning & Checkout
1. Point your barcode scanner at any item's barcode. The scanner enters the code and presses enter automatically.
2. The item is instantly verified from the backend database and added to your cart.
3. You can also click any item card in the product grid or search by name.
4. Adjust quantities with `+` and `-` buttons.
5. Click **Proceed to Pay**.
6. Select **Cash** or **Card**. For cash, click quick tender buttons (e.g. `+1000`) or type the amount received.
7. The system computes exact **Change Due**.
8. Click **Confirm Payment & Print Receipt**.
9. The printable receipt appears on screen with store details, itemized snapshot, and totals. Click **Print Receipt** to send to your thermal receipt printer.

### Processing a Customer Return
1. Go to **Sales & Returns**.
2. Locate the customer's transaction by receipt number.
3. Click **Receipt Detail**.
4. Click **Return** next to the item being returned.
5. Enter the quantity being returned (cannot exceed original purchase).
6. Check **Restock returned items back into branch inventory ledger** if the item is resellable.
7. Click **Authorize & Process Refund**. Cash is automatically deducted from the register drawer and stock is restored.

### Closing Shift & Reconciling Cash
1. At shift completion, click **Close Register & Reconcile** in the top bar.
2. Physically count all cash in the register drawer and enter the counted amount.
3. Click **End Shift & Close Session**.
4. The system calculates the variance against recorded sales, float, and refunds with full audit logging.

---

## 2. Store Management & Inventory Workflows

### Receiving Goods from Suppliers
1. Navigate to **Purchasing**.
2. Click **Receive Shipment (GRN)**.
3. Select the vendor, destination stockroom, product, quantity received, and cost price.
4. Click **Accept Shipment & Add to Stock**. Inventory balance is increased atomically and logged in the immutable movement ledger.

### Performing Stock Adjustments
1. Navigate to **Inventory**.
2. Click **Stock Adjustment**.
3. Select the product and location, enter quantity change (`+5` or `-2`), and choose a reason (e.g., damaged or count discrepancy).
4. Click **Apply Stock Adjustment**.

### Reviewing Executive Profit & Margin Reports
1. Navigate to **Reports**.
2. Review Gross Revenue, Gross Profit, Operating Margin %, Operating Expenses, and Net Profit.
3. Inspect the **Low Stock Watchlist** to plan purchasing before items run out.
