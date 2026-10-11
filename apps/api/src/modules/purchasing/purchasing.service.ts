import { Injectable, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';
import { DecimalMath } from '@universal-pos/shared';

@Injectable()
export class PurchasingService {
  constructor(private readonly db: DatabaseService) {}

  async getSuppliers(businessId: string) {
    const res = await this.db.query(
      `SELECT * FROM suppliers WHERE business_id = $1 ORDER BY name ASC`,
      [businessId]
    );
    return res.rows;
  }

  async createSupplier(
    businessId: string,
    dto: { supplierCode: string; name: string; contactDetails?: Record<string, any> }
  ) {
    const res = await this.db.query(
      `INSERT INTO suppliers (business_id, supplier_code, name, contact_details)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        businessId,
        dto.supplierCode.trim().toUpperCase(),
        dto.name.trim(),
        JSON.stringify(dto.contactDetails || {}),
      ]
    );
    return res.rows[0];
  }

  async createPurchaseOrder(
    businessId: string,
    userId: string,
    dto: {
      branchId: string;
      supplierId: string;
      currency?: string;
      items: Array<{ productId: string; quantity: string; unitCost: string }>;
    }
  ) {
    return this.db.withTransaction(async (client) => {
      let total = '0.0000';
      for (const it of dto.items) {
        total = DecimalMath.add(total, DecimalMath.multiply(it.quantity, it.unitCost));
      }

      const orderNumber = `PO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const poRes = await client.query(
        `INSERT INTO purchase_orders (
           business_id, branch_id, supplier_id, order_number, status, currency, total, created_by
         ) VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7)
         RETURNING *`,
        [
          businessId,
          dto.branchId,
          dto.supplierId,
          orderNumber,
          dto.currency || 'PKR',
          total,
          userId,
        ]
      );
      const po = poRes.rows[0];

      for (const it of dto.items) {
        await client.query(
          `INSERT INTO purchase_order_items (
             business_id, purchase_order_id, product_id, quantity_ordered, unit_cost
           ) VALUES ($1, $2, $3, $4, $5)`,
          [businessId, po.id, it.productId, it.quantity, it.unitCost]
        );
      }

      return po;
    });
  }

  async getPurchaseOrders(businessId: string) {
    const res = await this.db.query(
      `SELECT po.*, s.name as supplier_name, b.name as branch_name, u.full_name as created_by_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       JOIN branches b ON b.id = po.branch_id
       JOIN users u ON u.id = po.created_by
       WHERE po.business_id = $1
       ORDER BY po.created_at DESC`,
      [businessId]
    );
    return res.rows;
  }

  async receiveGoods(
    businessId: string,
    userId: string,
    dto: {
      branchId: string;
      locationId: string;
      supplierId: string;
      purchaseOrderId?: string;
      idempotencyKey?: string;
      notes?: string;
      items: Array<{ productId: string; quantity: string; unitCost?: string }>;
    }
  ) {
    const idemKey =
      dto.idempotencyKey ||
      `grn_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // Verify idempotency
    const existing = await this.db.query(
      `SELECT * FROM goods_receipts WHERE business_id = $1 AND idempotency_key = $2`,
      [businessId, idemKey]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    return this.db.withTransaction(async (client) => {
      const receiptNumber = `GRN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const grnRes = await client.query(
        `INSERT INTO goods_receipts (
           business_id, branch_id, location_id, purchase_order_id, supplier_id,
           receipt_number, idempotency_key, received_by, notes, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed')
         RETURNING *`,
        [
          businessId,
          dto.branchId,
          dto.locationId,
          dto.purchaseOrderId || null,
          dto.supplierId,
          receiptNumber,
          idemKey,
          userId,
          dto.notes || null,
        ]
      );
      const grn = grnRes.rows[0];

      for (const item of dto.items) {
        // Fetch current product cost
        const prod = await client.query(
          `SELECT id, cost_price FROM products WHERE business_id = $1 AND id = $2`,
          [businessId, item.productId]
        );
        const unitCost = item.unitCost || prod.rows[0]?.cost_price || '0.0000';

        await client.query(
          `INSERT INTO goods_receipt_items (
             business_id, goods_receipt_id, product_id, quantity_received, unit_cost
           ) VALUES ($1, $2, $3, $4, $5)`,
          [businessId, grn.id, item.productId, item.quantity, unitCost]
        );

        // Lock & update inventory balance
        const balRes = await client.query(
          `SELECT id, quantity_on_hand FROM inventory_balances
           WHERE business_id = $1 AND product_id = $2 AND location_id = $3
           FOR UPDATE`,
          [businessId, item.productId, dto.locationId]
        );

        if (balRes.rows.length > 0) {
          const newQty = DecimalMath.add(balRes.rows[0].quantity_on_hand, item.quantity);
          await client.query(
            `UPDATE inventory_balances
             SET quantity_on_hand = $1, updated_at = now()
             WHERE id = $2`,
            [newQty, balRes.rows[0].id]
          );
        } else {
          await client.query(
            `INSERT INTO inventory_balances (
               business_id, product_id, location_id, quantity_on_hand, quantity_reserved
             ) VALUES ($1, $2, $3, $4, 0)`,
            [businessId, item.productId, dto.locationId, item.quantity]
          );
        }

        // Append purchase movement
        await client.query(
          `INSERT INTO inventory_movements (
             business_id, product_id, location_id, movement_type,
             quantity_change, unit_cost, reference_type, reference_id, created_by
           ) VALUES ($1, $2, $3, 'purchase', $4, $5, 'goods_receipt', $6, $7)`,
          [
            businessId,
            item.productId,
            dto.locationId,
            item.quantity,
            unitCost,
            grn.id,
            userId,
          ]
        );
      }

      return grn;
    });
  }
}
