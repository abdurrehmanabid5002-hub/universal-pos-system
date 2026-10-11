import { BusinessType, ProductType, MovementType, SaleStatus, PaymentStatus, ReturnStatus } from '@universal-pos/shared';

export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  REGISTER_NOT_OPEN = 'REGISTER_NOT_OPEN',
  REGISTER_ALREADY_OPEN = 'REGISTER_ALREADY_OPEN',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  EXCEEDS_RETURNABLE_QUANTITY = 'EXCEEDS_RETURNABLE_QUANTITY',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export const Permissions = {
  BUSINESS_READ: 'business.read',
  BUSINESS_UPDATE: 'business.update',
  SETTINGS_MANAGE: 'settings.manage',

  BRANCH_READ: 'branch.read',
  BRANCH_MANAGE: 'branch.manage',
  EMPLOYEE_INVITE: 'employee.invite',
  EMPLOYEE_MANAGE: 'employee.manage',

  PRODUCT_READ: 'product.read',
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_ARCHIVE: 'product.archive',

  INVENTORY_READ: 'inventory.read',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',

  PURCHASE_CREATE: 'purchase.create',
  PURCHASE_APPROVE: 'purchase.approve',
  PURCHASE_RECEIVE: 'purchase.receive',

  SALE_CREATE: 'sale.create',
  SALE_READ: 'sale.read',
  SALE_VOID: 'sale.void',
  DISCOUNT_APPLY: 'discount.apply',
  DISCOUNT_OVERRIDE: 'discount.override',

  RETURN_CREATE: 'return.create',
  RETURN_APPROVE: 'return.approve',
  REFUND_PROCESS: 'refund.process',

  EXPENSE_CREATE: 'expense.create',
  EXPENSE_APPROVE: 'expense.approve',

  REPORT_SALES_READ: 'report.sales.read',
  REPORT_INVENTORY_READ: 'report.inventory.read',
  REPORT_PROFIT_READ: 'report.profit.read',

  AUDIT_READ: 'audit.read',
} as const;

export type PermissionCode = typeof Permissions[keyof typeof Permissions];

// DTO Contracts
export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  businessName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthSessionResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  memberships: Array<{
    businessId: string;
    businessName: string;
    businessSlug: string;
    roleName: string;
    permissions: string[];
  }>;
}

export interface CreateBusinessDto {
  name: string;
  slug?: string;
  businessType?: BusinessType;
  defaultCurrency?: string;
  timezone?: string;
}

export interface CreateBranchDto {
  name: string;
  code: string;
  address?: Record<string, any>;
}

export interface CreateRegisterDto {
  branchId: string;
  name: string;
  code: string;
}

export interface CreateCategoryDto {
  name: string;
  parentId?: string;
  description?: string;
}

export interface CreateProductDto {
  sku: string;
  name: string;
  categoryId?: string;
  productType?: ProductType;
  baseUnit?: string;
  costPrice: string;
  sellingPrice: string;
  tracksInventory?: boolean;
  barcodes?: string[];
  attributes?: Record<string, any>;
}

export interface UpdateProductDto {
  name?: string;
  categoryId?: string;
  costPrice?: string;
  sellingPrice?: string;
  status?: 'active' | 'inactive' | 'archived';
  attributes?: Record<string, any>;
}

export interface CreateStockAdjustmentDto {
  locationId: string;
  productId: string;
  variantId?: string;
  quantityChange: string;
  reason: string;
  reference?: string;
}

export interface CheckoutItemDto {
  productId: string;
  variantId?: string;
  quantity: string;
  discount?: {
    type: 'fixed' | 'percentage';
    value: string;
  };
}

export interface CheckoutPaymentDto {
  method: 'cash' | 'card' | 'online';
  amount: string;
  providerReference?: string;
}

export interface CheckoutSaleDto {
  branchId: string;
  registerId: string;
  currency?: string;
  customerId?: string;
  items: CheckoutItemDto[];
  discount?: {
    type: 'fixed' | 'percentage';
    value: string;
  };
  payments: CheckoutPaymentDto[];
}

export interface SaleSummaryResponse {
  saleId: string;
  receiptNumber: string;
  status: SaleStatus;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  amountPaid: string;
  changeDue: string;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: string;
    unitPrice: string;
    discountAmount: string;
    taxAmount: string;
    lineTotal: string;
  }>;
}

export interface CreateReturnDto {
  originalSaleId: string;
  reason: string;
  refundMethod: 'cash' | 'card' | 'store_credit';
  items: Array<{
    originalSaleItemId: string;
    quantity: string;
    restock: boolean;
  }>;
}
