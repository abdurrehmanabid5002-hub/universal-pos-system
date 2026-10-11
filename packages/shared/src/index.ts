/**
 * Decimal math helper operating on string / integer scaled representations
 * avoiding IEEE 754 binary floating-point inaccuracies.
 */
export class DecimalMath {
  private static readonly SCALE = 10000; // 4 decimal places

  public static toScaled(val: string | number): number {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return Math.round(num * DecimalMath.SCALE);
  }

  public static fromScaled(scaled: number): string {
    return (scaled / DecimalMath.SCALE).toFixed(4);
  }

  public static add(a: string | number, b: string | number): string {
    const sum = DecimalMath.toScaled(a) + DecimalMath.toScaled(b);
    return DecimalMath.fromScaled(sum);
  }

  public static subtract(a: string | number, b: string | number): string {
    const diff = DecimalMath.toScaled(a) - DecimalMath.toScaled(b);
    return DecimalMath.fromScaled(diff);
  }

  public static multiply(a: string | number, b: string | number): string {
    const mult = (DecimalMath.toScaled(a) * DecimalMath.toScaled(b)) / DecimalMath.SCALE;
    return DecimalMath.fromScaled(Math.round(mult));
  }

  public static divide(a: string | number, b: string | number): string {
    const bScaled = DecimalMath.toScaled(b);
    if (bScaled === 0) throw new Error('Division by zero');
    const div = (DecimalMath.toScaled(a) * DecimalMath.SCALE) / bScaled;
    return DecimalMath.fromScaled(Math.round(div));
  }

  public static roundTo(val: string | number, decimals: number = 2): string {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    const factor = Math.pow(10, decimals);
    return (Math.round((num + Number.EPSILON) * factor) / factor).toFixed(decimals);
  }

  public static compare(a: string | number, b: string | number): number {
    const diff = DecimalMath.toScaled(a) - DecimalMath.toScaled(b);
    return diff > 0 ? 1 : diff < 0 ? -1 : 0;
  }

  public static isZero(val: string | number): boolean {
    return DecimalMath.toScaled(val) === 0;
  }

  public static isPositive(val: string | number): boolean {
    return DecimalMath.toScaled(val) > 0;
  }

  public static isNegative(val: string | number): boolean {
    return DecimalMath.toScaled(val) < 0;
  }
}

export type BusinessType =
  | 'general_retail'
  | 'grocery'
  | 'supermarket'
  | 'clothing'
  | 'pharmacy'
  | 'restaurant'
  | 'bakery'
  | 'electronics'
  | 'wholesale'
  | 'bookshop'
  | 'cosmetics';

export type ProductType = 'stock' | 'service' | 'non_stock';

export type MovementType =
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'return'
  | 'adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'damage'
  | 'waste';

export type SaleStatus = 'draft' | 'pending_payment' | 'completed' | 'cancelled' | 'voided';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type ReturnStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export type RestockStatus = 'pending' | 'restocked' | 'damaged' | 'not_restocked';

export type RegisterSessionStatus = 'open' | 'closed';

export type ExpenseStatus = 'pending' | 'recorded' | 'voided';

export interface UserContext {
  userId: string;
  email: string;
  fullName: string;
  businessId?: string;
  roleId?: string;
  roleName?: string;
  permissions?: string[];
  branchIds?: string[];
}

export interface StandardApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp?: string;
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface StandardApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    requestId: string;
  };
}
