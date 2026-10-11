# Universal POS API Specification

Base Path: `/api/v1`  
Interactive OpenAPI / Swagger UI: `http://localhost:3000/api/docs`

---

## 1. Standard Response & Error Envelopes

### Success Envelope
```json
{
  "data": {
    "id": "uuid",
    "status": "active"
  },
  "meta": {
    "requestId": "req_1728000000_abcde",
    "timestamp": "2026-10-11T10:00:00.000Z"
  }
}
```

### Error Envelope
```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "The requested quantity is not available.",
    "details": {
      "productId": "uuid",
      "available": "5.0000",
      "requested": "10.0000"
    },
    "requestId": "req_1728000000_abcde"
  }
}
```

---

## 2. Authentication & Identity Endpoints

### `POST /api/v1/auth/register`
Creates user account and optional initial business organization with Owner role.
- **Request Body:**
  ```json
  {
    "email": "owner@apexmart.com",
    "password": "Password123!",
    "fullName": "Alice Founder",
    "businessName": "Apex Supermart"
  }
  ```

### `POST /api/v1/auth/login`
Authenticates credentials, sets `pos_session` HttpOnly cookie and returns session token.

### `POST /api/v1/auth/logout`
Revokes session in database and clears session cookie.

### `GET /api/v1/auth/me`
Returns current user profile and list of accessible business memberships and roles.

---

## 3. Product Catalog Endpoints

### `POST /api/v1/businesses/:businessId/products`
Creates product in business catalog with optional barcodes.
- **Header:** `Authorization: Bearer <token>` or session cookie
- **Request Body:**
  ```json
  {
    "sku": "MILK-001",
    "name": "Milk 1 Liter",
    "categoryId": "category-uuid",
    "costPrice": "180.0000",
    "sellingPrice": "220.0000",
    "tracksInventory": true,
    "barcodes": ["8900000000001"]
  }
  ```

### `GET /api/v1/businesses/:businessId/products`
Search and paginate products. Query parameters: `search`, `categoryId`, `status`, `limit`, `offset`.

### `GET /api/v1/businesses/:businessId/products/lookup/:barcode`
Fast barcode scanner lookup returning product details and current total stock on hand.

---

## 4. Sales & POS Checkout Endpoints

### `POST /api/v1/businesses/:businessId/sales`
Authoritatively executes checkout, calculates prices, locks inventory, deducts stock, and records receipt.
- **Header:** `Idempotency-Key: unique-client-operation-key`
- **Request Body:**
  ```json
  {
    "branchId": "branch-uuid",
    "registerId": "register-uuid",
    "currency": "PKR",
    "items": [
      { "productId": "prod-uuid", "quantity": "2.0000" }
    ],
    "discount": { "type": "fixed", "value": "0.0000" },
    "payments": [
      { "method": "cash", "amount": "500.00" }
    ]
  }
  ```

---

## 5. Returns & Refunds Endpoints

### `POST /api/v1/businesses/:businessId/returns`
Processes product returns, verifies eligible remaining returnable quantities, adds restocking inventory movements, and records refund cash outflow.

---

## 6. Inventory & Reconciliation Endpoints

### `GET /api/v1/businesses/:businessId/inventory`
Returns operational stock balances per product and location.

### `POST /api/v1/businesses/:businessId/inventory/adjustments`
Authorized manual stock adjustment (damaged, expired, audit correction).

### `POST /api/v1/businesses/:businessId/inventory/reconcile`
Verifies balance projection against sum of immutable movement history and reconciles differences.

---

## 7. Register Sessions Endpoints

### `POST /api/v1/businesses/:businessId/registers/open`
Opens register shift and sets starting cash float.

### `GET /api/v1/businesses/:businessId/registers/:registerId/current-session`
Returns current session with expected cash drawer calculation.

### `POST /api/v1/businesses/:businessId/registers/sessions/:sessionId/close`
Closes register shift, reconciles physical cash against recorded movements, and calculates variance.

---

## 8. Reports & Analytics Endpoints

- `GET /api/v1/businesses/:businessId/reports/sales`
- `GET /api/v1/businesses/:businessId/reports/inventory`
- `GET /api/v1/businesses/:businessId/reports/profit`
- `GET /api/v1/businesses/:businessId/audit-logs`
