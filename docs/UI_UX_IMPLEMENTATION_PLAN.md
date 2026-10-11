# Universal POS UI/UX Implementation Plan & Screen Inventory

## 1. Visual Design Specification (Bright Commercial Theme)
Based on the reference SaaS design (TamamPOS / Universal POS standard):
- **Sidebar Navigation:** Premium deep slate navy (`#0f172a` / `#1e293b`), crisp typography, active state vibrant royal blue (`#2563eb`), hover state soft translucent slate (`rgba(255,255,255,0.06)`).
- **Main App Canvas:** Bright clean neutral background (`#f8fafc`), pure white card surfaces (`#ffffff`), subtle borders (`#e2e8f0`), soft natural elevation shadows (`0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`).
- **Typography:** Modern clean sans-serif (Inter / System UI), high contrast primary text (`#0f172a`), secondary muted text (`#64748b`), crisp mono font for numeric receipts and SKU/barcodes (`JetBrains Mono, SFMono-Regular, monospace`).
- **Accent & Status Colors:**
  - Primary Action: Vibrant Royal Blue (`#2563eb`, hover `#1d4ed8`)
  - Success / Active: Emerald Green (`#10b981`, badge background `#dcfce7`, text `#15803d`)
  - Warning / Alert: Amber (`#f59e0b`, badge background `#fef3c7`, text `#b45309`)
  - Danger / Void: Rose Red (`#ef4444`, badge background `#fee2e2`, text `#b91c1c`)
  - Info / Role Pill: Sky Blue (`#0ea5e9`, badge background `#e0f2fe`, text `#0369a1`), Purple (`#8b5cf6`, badge `#ede9fe`, text `#6d28d9`)
- **Layout:** Responsive collapsible sidebar + sticky header (search bar, branch/register switcher, notification indicator, user profile badge) + breadcrumbs + fluid content grid.

---

## 2. Screen Inventory & Checklist

### Module 1: Authentication & Onboarding
- [ ] **AuthPage (`/auth`):**
  - Bright split-card or centered card layout matching the modern SaaS aesthetic.
  - Sign in with email and password.
  - 1-click **"Sign in with Demo Store"** (`owner@apexmart.com`).
  - Store registration with full name, email, password, and business name.
  - Form validation, error messaging, and loading indicators.

### Module 2: Executive Dashboard (`/dashboard`)
- [ ] **DashboardPage (`/dashboard`):**
  - Top KPI cards: Today's Gross Sales, Total Orders, Estimated Profit, Low Stock Alerts.
  - Visual revenue bar graph / performance metrics across the week.
  - Quick action shortcuts: "New Sale (POS)", "Add Product", "Receive Stock", "Open/Close Register".
  - Recent transactions table with status pills and quick view modal.
  - Real-time stock status widget showing low stock warnings.

### Module 3: POS Checkout Terminal (`/pos`)
- [ ] **PosPage (`/pos`):**
  - High-efficiency two-column split layout for rapid counter checkout.
  - **Left column:**
    - Live search input + instant keyboard barcode scanner handler.
    - Category pill filter tabs (All, Dairy, Bakery, Beverages, etc.).
    - Product cards with price tag, SKU badge, and remaining stock indicator.
    - Responsive touch-friendly layout for tablets and desktops.
  - **Right column (Cart & Checkout):**
    - Customer assignment selector with "Add Walk-in Customer" option.
    - Line item list: quantity increment/decrement, item discount override, delete.
    - Authoritative summary calculations: Subtotal, Discounts, Tax, Grand Total.
    - Register status badge (Open / Closed) with warning if register is unopened.
    - Tender payment modal with Cash/Card selection, quick tender chips (+100, +500, +1000, +5000), cash change calculation.
    - Idempotent checkout submission with backend stock validation.
    - Printable thermal receipt modal with browser `window.print()` and snapshot reprinting.

### Module 4: Products & Categories (`/products`)
- [ ] **ProductsPage (`/products`):**
  - Search by name, SKU, or barcode.
  - Filter by category tab/dropdown.
  - Product table with thumbnail/avatar icon, SKU, barcodes, category, cost price, selling price, and stock status.
  - "+ Add Product" modal with SKU, name, category, cost price, selling price, barcode, tracks inventory toggle.
  - Category manager tab/modal to create and view categories.

### Module 5: Inventory, Adjustments & Ledgers (`/inventory`)
- [ ] **InventoryPage (`/inventory`):**
  - Stock Balances tab: current on-hand quantities per product and location, stock valuation.
  - Stock Movements tab: audit ledger showing movement types (`sale`, `purchase_receive`, `adjustment`, `return`).
  - "+ Adjust Stock" modal: select product, location, quantity change (+/-), and audit reason.
  - "1-Click Reconciliation" tool: verifies projected ledger balance against physical count.

### Module 6: Purchasing, Suppliers & Goods Receiving (`/purchasing`)
- [ ] **PurchasingPage (`/purchasing`):**
  - Suppliers tab: list suppliers (contact person, phone, email), "+ Add Supplier" modal.
  - Purchase Orders tab: list orders (PO number, supplier, status, total cost).
  - "+ New Purchase Order" modal: supplier selection, line items with expected unit costs.
  - "Receive Goods" modal: receive items into a target branch inventory location, automatically increasing on-hand stock and logging movement records.

### Module 7: Customers & Loyalty (`/customers`)
- [ ] **CustomersPage (`/customers`):**
  - Customer directory with search (name, phone, email).
  - Customer table showing name, phone, email, total spend, and loyalty points.
  - "+ Add Customer" modal.
  - Customer purchase history drawer/modal showing previous receipts.

### Module 8: Sales, Receipts & Returns (`/sales`)
- [ ] **SalesPage (`/sales`):**
  - Historical sales ledger with date, receipt number, cashier, customer, grand total, and payment method.
  - "View Receipt" modal displaying complete line-item breakdown.
  - "Process Return / Refund" modal: select items to return, refund method (cash/card), reason, and restock checkbox.
  - Verified backend stock replenishment upon return approval.

### Module 9: Cash Registers & Shift Reconciliation (`/registers`)
- [ ] **RegistersPage (`/registers`):**
  - Register overview by branch with status (Open / Closed).
  - "Open Shift" modal: enter starting cash float amount.
  - "Cash In / Cash Out" modal: record pay-in or cash drop with note.
  - "Close Shift" modal: enter physical closing cash count, calculate cash variance (expected vs actual), and commit shift closure.

### Module 10: Operating Expenses (`/expenses`)
- [ ] **ExpensesPage (`/expenses`):**
  - Expense ledger with date, category (Rent, Utilities, Wages, Supplies, Maintenance), amount, and notes.
  - "+ Record Expense" modal.
  - Total operating expense sum card.

### Module 11: Reports & Financial Analytics (`/reports`)
- [ ] **ReportsPage (`/reports`):**
  - Date range filters (Today, Yesterday, Last 7 Days, Month to Date).
  - Sales Revenue Report: gross sales, discounts, net sales, taxes collected.
  - Cost of Goods Sold (COGS) & Profit Report: revenue, total cost of goods, gross margin %.
  - Inventory Valuation Report: total asset value of current on-hand inventory.
  - CSV / JSON export trigger.

### Module 12: Employees, Roles & Permissions (`/employees`)
- [ ] **EmployeesPage (`/employees`):**
  - Matches the user's reference image precisely!
  - Employee directory table with Avatar, Name, Email, Role badge (Manager, Cashier, Inventory Staff, etc.), Status dot (Active / Inactive), Last Login, Actions.
  - "+ Add Employee" / Invite Employee modal with email, role selection, and branch assignments.
  - Roles & Permissions tab / drawer showing role hierarchy and granular permission badges.

### Module 13: Store Settings, Branches & Industry Extensions (`/settings`)
- [ ] **SettingsPage (`/settings`):**
  - Business profile (Name, currency, timezone, tax rate).
  - Branches manager (List branches, create new branch, branch switcher).
  - Registers manager (Create registers per branch).
  - Industry extensions:
    - Restaurant: floor tables management (Table layout, capacity, status: Available / Occupied).
    - Pharmacy: batch number & expiry date tracking.
    - Electronics: serial number / IMEI tracking.
  - Audit Logs viewer: audit trail of sensitive business activities.

---

## 3. UI Shell & Navigation Architecture
- **AppLayout:**
  - Sidebar: Collapsible desktop sidebar + slide-over mobile drawer.
  - Top Header: Current branch & register indicator, quick search input, full-screen POS shortcut, profile dropdown with active role and logout button.
  - Breadcrumbs & Page Titles.
  - Toast Notification System (success, error, warning).
- **Responsive Breakpoints:**
  - Desktop (>1024px): Full sidebar, dual-column POS, spacious data tables.
  - Tablet (768px - 1024px): Icon-collapsed sidebar, touch-optimized POS buttons.
  - Mobile (<768px): Hamburger drawer, stacked POS cart toggle, scrollable tables.

---

## 4. Verification & Testing Strategy
- End-to-end integration with the live backend NestJS API (`http://localhost:3000`).
- Automated tests verifying navigation, authentication, catalog loading, POS checkout, shift reconciliation, inventory movement, and report calculations.
