import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode, CreateReturnDto } from '@universal-pos/contracts';
import { DecimalMath } from '@universal-pos/shared';

@Injectable()
export class ReturnsService {
  constructor(private readonly db: DatabaseService) {}

  async processReturn(businessId: string, userId: string, dto: CreateReturnDto) {
    return this.db.withTransaction(async (client) => {
      // 1. Fetch original sale
      const saleRes = await client.query(
        `SELECT id, branch_id, register_id, currency, status
         FROM sales
         WHERE business_id = $1 AND id = $2`,
        [businessId, dto.originalSaleId]
      );

      if (saleRes.rows.length === 0) {
        throw new ApiException(ErrorCode.NOT_FOUND, 'Original sale not found in this business.', HttpStatus.NOT_FOUND);
      }

      const sale = saleRes.rows[0];
      if (sale.status !== 'completed') {
        throw new ApiException(
          ErrorCode.BAD_REQUEST,
          `Cannot return a sale with status: ${sale.status}`,
          HttpStatus.BAD_REQUEST
        );
      }

      // Find branch location for restocking
      const locRes = await client.query(
        `SELECT id FROM inventory_locations WHERE business_id = $1 AND branch_id = $2 LIMIT 1`,
        [businessId, sale.branch_id]
      );
      const locationId = locRes.rows[0]?.id;

      // Find open register session for cash refund if applicable
      const openReg = await client.query(
        `SELECT id FROM register_sessions
         WHERE business_id = $1 AND register_id = $2 AND closed_at IS NULL`,
        [businessId, sale.register_id]
      );
      const openSessionId = openReg.rows[0]?.id;

      let refundTotal = '0.0000';
      const processedItems: any[] = [];

      // 2. Validate returnable quantities and compute refund
      for (const item of dto.items) {
        const itemRes = await client.query(
          `SELECT si.*,
                  COALESCE(
                    (SELECT SUM(ri.quantity) FROM return_items ri
                     JOIN returns ret ON ret.id = ri.return_id
                     WHERE ri.original_sale_item_id = si.id AND ret.status IN ('completed', 'approved')),
                    0
                  ) as returned_so_far
           FROM sale_items si
           WHERE si.business_id = $1 AND si.id = $2 AND si.sale_id = $3`,
          [businessId, item.originalSaleItemId, sale.id]
        );

        if (itemRes.rows.length === 0) {
          throw new ApiException(
            ErrorCode.NOT_FOUND,
            `Sale item ${item.originalSaleItemId} not found on this sale.`,
            HttpStatus.NOT_FOUND
          );
        }

        const saleItem = itemRes.rows[0];
        const returnable = DecimalMath.subtract(saleItem.quantity, saleItem.returned_so_far);

        if (DecimalMath.compare(item.quantity, returnable) > 0) {
          throw new ApiException(
            ErrorCode.EXCEEDS_RETURNABLE_QUANTITY,
            `Return quantity ${item.quantity} exceeds eligible remaining quantity ${returnable} for "${saleItem.product_name_snapshot}".`,
            HttpStatus.UNPROCESSABLE_ENTITY,
            { itemId: saleItem.id, requested: item.quantity, eligible: returnable }
          );
        }

        // Refund proportional to effective unit line total
        const unitLinePrice = DecimalMath.divide(saleItem.line_total, saleItem.quantity);
        const itemRefund = DecimalMath.multiply(unitLinePrice, item.quantity);
        refundTotal = DecimalMath.add(refundTotal, itemRefund);

        // Restock inventory if requested
        if (item.restock && locationId) {
          // Lock balance
          const balRes = await client.query(
            `SELECT id, quantity_on_hand FROM inventory_balances
             WHERE business_id = $1 AND product_id = $2 AND location_id = $3
             FOR UPDATE`,
            [businessId, saleItem.product_id, locationId]
          );

          if (balRes.rows.length > 0) {
            const newStock = DecimalMath.add(balRes.rows[0].quantity_on_hand, item.quantity);
            await client.query(
              `UPDATE inventory_balances
               SET quantity_on_hand = $1, updated_at = now()
               WHERE id = $2`,
              [newStock, balRes.rows[0].id]
            );
          } else {
            await client.query(
              `INSERT INTO inventory_balances (
                 business_id, product_id, location_id, quantity_on_hand, quantity_reserved
               ) VALUES ($1, $2, $3, $4, 0)`,
              [businessId, saleItem.product_id, locationId, item.quantity]
            );
          }

          // Append return movement
          await client.query(
            `INSERT INTO inventory_movements (
               business_id, product_id, location_id, movement_type,
               quantity_change, unit_cost, reference_type, reference_id, created_by
             ) VALUES ($1, $2, $3, 'return', $4, $5, 'sale_return', $6, $7)`,
            [
              businessId,
              saleItem.product_id,
              locationId,
              item.quantity,
              saleItem.unit_cost_snapshot,
              sale.id,
              userId,
            ]
          );
        }

        processedItems.push({
          originalSaleItemId: saleItem.id,
          quantity: item.quantity,
          refundAmount: itemRefund,
          restockStatus: item.restock ? 'restocked' : 'not_restocked',
        });
      }

      // 3. Create Return Header
      const returnNumber = `RET-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const returnRes = await client.query(
        `INSERT INTO returns (
           business_id, original_sale_id, branch_id, return_number,
           processed_by, reason, refund_total, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
         RETURNING *`,
        [
          businessId,
          sale.id,
          sale.branch_id,
          returnNumber,
          userId,
          dto.reason || 'Customer return',
          refundTotal,
        ]
      );
      const ret = returnRes.rows[0];

      // 4. Insert Return Items
      for (const pi of processedItems) {
        await client.query(
          `INSERT INTO return_items (
             business_id, return_id, original_sale_item_id,
             quantity, refund_amount, restock_status
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            businessId,
            ret.id,
            pi.originalSaleItemId,
            pi.quantity,
            pi.refundAmount,
            pi.restockStatus,
          ]
        );
      }

      // 5. If cash refund and register open, record cash outflow
      if (dto.refundMethod === 'cash' && openSessionId) {
        await client.query(
          `INSERT INTO register_cash_movements (
             business_id, session_id, movement_type, amount,
             reference_type, reference_id, notes, created_by
           ) VALUES ($1, $2, 'cash_refund', $3, 'return', $4, $5, $6)`,
          [
            businessId,
            openSessionId,
            refundTotal,
            ret.id,
            `Refund ${returnNumber}`,
            userId,
          ]
        );
      }

      return {
        returnId: ret.id,
        returnNumber: ret.return_number,
        refundTotal: DecimalMath.roundTo(ret.refund_total, 2),
        status: ret.status,
        items: processedItems,
      };
    });
  }

  async getReturns(businessId: string, limit = 50, offset = 0) {
    const res = await this.db.query(
      `SELECT r.*, s.receipt_number as original_receipt_number, u.full_name as processed_by_name
       FROM returns r
       JOIN sales s ON s.id = r.original_sale_id
       JOIN users u ON u.id = r.processed_by
       WHERE r.business_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, limit, offset]
    );
    return res.rows;
  }
}
