import { Injectable, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode, CheckoutSaleDto } from '@universal-pos/contracts';
import { DecimalMath } from '@universal-pos/shared';

@Injectable()
export class SalesService {
  constructor(private readonly db: DatabaseService) {}

  async checkout(
    businessId: string,
    cashierId: string,
    idempotencyKey: string,
    dto: CheckoutSaleDto
  ) {
    if (!idempotencyKey) {
      idempotencyKey = `auto_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    // 1. Check idempotency record
    const existingKey = await this.db.query(
      `SELECT status, response_body FROM idempotency_records
       WHERE business_id = $1 AND idempotency_key = $2`,
      [businessId, idempotencyKey]
    );

    if (existingKey.rows.length > 0) {
      const rec = existingKey.rows[0];
      if (rec.status === 'completed' && rec.response_body) {
        return rec.response_body;
      }
      if (rec.status === 'processing') {
        throw new ApiException(
          ErrorCode.IDEMPOTENCY_CONFLICT,
          'Checkout is already processing for this idempotency key. Please wait.',
          HttpStatus.CONFLICT
        );
      }
    }

    // Insert idempotency placeholder
    await this.db.query(
      `INSERT INTO idempotency_records (
         business_id, idempotency_key, request_hash, status
       ) VALUES ($1, $2, $3, 'processing')
       ON CONFLICT (business_id, idempotency_key) DO NOTHING`,
      [businessId, idempotencyKey, crypto.createHash('md5').update(JSON.stringify(dto)).digest('hex')]
    );

    try {
      const result = await this.db.withTransaction(async (client) => {
        // 2. Validate branch and register
        const regRes = await client.query(
          `SELECT r.id, r.branch_id, s.id as session_id
           FROM registers r
           LEFT JOIN register_sessions s ON s.register_id = r.id AND s.closed_at IS NULL
           WHERE r.business_id = $1 AND r.id = $2`,
          [businessId, dto.registerId]
        );

        if (regRes.rows.length === 0) {
          throw new ApiException(ErrorCode.NOT_FOUND, 'Register not found in business.', HttpStatus.NOT_FOUND);
        }

        const register = regRes.rows[0];
        if (!register.session_id) {
          throw new ApiException(
            ErrorCode.REGISTER_NOT_OPEN,
            'Cannot execute sale: No active register session open. Please open the register first.',
            HttpStatus.BAD_REQUEST
          );
        }

        // Get default stockroom location for branch
        const locRes = await client.query(
          `SELECT id FROM inventory_locations WHERE business_id = $1 AND branch_id = $2 LIMIT 1`,
          [businessId, dto.branchId]
        );
        const locationId = locRes.rows[0]?.id;

        // 3. Process line items with authoritative prices & stock deduction
        let subtotal = '0.0000';
        let discountTotal = '0.0000';
        let taxTotal = '0.0000';
        const processedItems: any[] = [];

        for (const item of dto.items) {
          // Authoritative product lookup
          const prodRes = await client.query(
            `SELECT id, sku, name, selling_price, cost_price, tracks_inventory, status
             FROM products
             WHERE business_id = $1 AND id = $2`,
            [businessId, item.productId]
          );

          if (prodRes.rows.length === 0) {
            throw new ApiException(
              ErrorCode.NOT_FOUND,
              `Product ${item.productId} not found in business.`,
              HttpStatus.NOT_FOUND
            );
          }

          const product = prodRes.rows[0];
          if (product.status !== 'active') {
            throw new ApiException(
              ErrorCode.BAD_REQUEST,
              `Product ${product.name} is not active for sale.`,
              HttpStatus.BAD_REQUEST
            );
          }

          const qty = item.quantity;
          const unitPrice = product.selling_price;
          const rawLine = DecimalMath.multiply(unitPrice, qty);

          // Calculate line discount
          let lineDiscount = '0.0000';
          if (item.discount) {
            if (item.discount.type === 'percentage') {
              const pct = DecimalMath.divide(item.discount.value, '100.0000');
              lineDiscount = DecimalMath.multiply(rawLine, pct);
            } else {
              lineDiscount = item.discount.value;
            }
          }

          const lineAfterDiscount = DecimalMath.subtract(rawLine, lineDiscount);
          const lineTax = '0.0000'; // Default zero tax unless taxed
          const lineTotal = DecimalMath.add(lineAfterDiscount, lineTax);

          subtotal = DecimalMath.add(subtotal, rawLine);
          discountTotal = DecimalMath.add(discountTotal, lineDiscount);
          taxTotal = DecimalMath.add(taxTotal, lineTax);

          // 4. Lock & update inventory if tracked
          if (product.tracks_inventory && locationId) {
            const balRes = await client.query(
              `SELECT id, quantity_on_hand FROM inventory_balances
               WHERE business_id = $1 AND product_id = $2 AND location_id = $3
               FOR UPDATE`,
              [businessId, product.id, locationId]
            );

            const currentStock = balRes.rows.length > 0 ? balRes.rows[0].quantity_on_hand : '0.0000';
            if (DecimalMath.compare(currentStock, qty) < 0) {
              throw new ApiException(
                ErrorCode.INSUFFICIENT_STOCK,
                `Insufficient stock for "${product.name}". Available: ${currentStock}, Requested: ${qty}`,
                HttpStatus.UNPROCESSABLE_ENTITY,
                { productId: product.id, productName: product.name, available: currentStock, requested: qty }
              );
            }

            const newStock = DecimalMath.subtract(currentStock, qty);
            await client.query(
              `UPDATE inventory_balances
               SET quantity_on_hand = $1, updated_at = now()
               WHERE id = $2`,
              [newStock, balRes.rows[0].id]
            );

            // Record movement
            await client.query(
              `INSERT INTO inventory_movements (
                 business_id, product_id, location_id, movement_type,
                 quantity_change, unit_cost, reference_type, created_by
               ) VALUES ($1, $2, $3, 'sale', $4, $5, 'sale_checkout', $6)`,
              [
                businessId,
                product.id,
                locationId,
                `-${qty}`,
                product.cost_price,
                cashierId,
              ]
            );
          }

          processedItems.push({
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: qty,
            unitPrice,
            unitCost: product.cost_price,
            discountAmount: lineDiscount,
            taxAmount: lineTax,
            lineTotal,
          });
        }

        // Apply cart level discount if specified
        if (dto.discount) {
          if (dto.discount.type === 'percentage') {
            const pct = DecimalMath.divide(dto.discount.value, '100.0000');
            const cartDisc = DecimalMath.multiply(subtotal, pct);
            discountTotal = DecimalMath.add(discountTotal, cartDisc);
          } else {
            discountTotal = DecimalMath.add(discountTotal, dto.discount.value);
          }
        }

        const grandTotal = DecimalMath.add(DecimalMath.subtract(subtotal, discountTotal), taxTotal);

        // 5. Authoritative Payment validation
        let amountPaid = '0.0000';
        for (const p of dto.payments) {
          amountPaid = DecimalMath.add(amountPaid, p.amount);
        }

        if (DecimalMath.compare(amountPaid, grandTotal) < 0) {
          throw new ApiException(
            ErrorCode.BAD_REQUEST,
            `Insufficient payment tendered. Total: ${grandTotal}, Paid: ${amountPaid}`,
            HttpStatus.BAD_REQUEST,
            { grandTotal, amountPaid }
          );
        }

        const changeDue = DecimalMath.subtract(amountPaid, grandTotal);
        const receiptNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        // 6. Create Sale Header
        const saleRes = await client.query(
          `INSERT INTO sales (
             business_id, branch_id, register_id, cashier_id, customer_id,
             receipt_number, idempotency_key, status, currency,
             subtotal, discount_total, tax_total, grand_total,
             amount_paid, change_due, completed_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9, $10, $11, $12, $13, $14, now())
           RETURNING *`,
          [
            businessId,
            dto.branchId,
            dto.registerId,
            cashierId,
            dto.customerId || null,
            receiptNumber,
            idempotencyKey,
            dto.currency || 'PKR',
            subtotal,
            discountTotal,
            taxTotal,
            grandTotal,
            amountPaid,
            changeDue,
          ]
        );
        const sale = saleRes.rows[0];

        // 7. Insert Sale Items
        for (const pi of processedItems) {
          await client.query(
            `INSERT INTO sale_items (
               business_id, sale_id, product_id, product_name_snapshot,
               sku_snapshot, quantity, unit_price, unit_cost_snapshot,
               discount_amount, tax_amount, line_total
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              businessId,
              sale.id,
              pi.productId,
              pi.productName,
              pi.sku,
              pi.quantity,
              pi.unitPrice,
              pi.unitCost,
              pi.discountAmount,
              pi.taxAmount,
              pi.lineTotal,
            ]
          );
        }

        // 8. Record Payments & register cash movements
        for (const p of dto.payments) {
          await client.query(
            `INSERT INTO payments (
               business_id, sale_id, payment_method, amount, currency,
               status, provider_reference, idempotency_key
             ) VALUES ($1, $2, $3, $4, $5, 'succeeded', $6, $7)`,
            [
              businessId,
              sale.id,
              p.method,
              p.amount,
              sale.currency,
              p.providerReference || null,
              `${idempotencyKey}_pay_${p.method}`,
            ]
          );

          if (p.method === 'cash') {
            await client.query(
              `INSERT INTO register_cash_movements (
                 business_id, session_id, movement_type, amount,
                 reference_type, reference_id, notes, created_by
               ) VALUES ($1, $2, 'cash_sale', $3, 'sale', $4, $5, $6)`,
              [
                businessId,
                register.session_id,
                DecimalMath.subtract(p.amount, changeDue), // net cash added to register
                sale.id,
                `Receipt ${receiptNumber}`,
                cashierId,
              ]
            );
          }
        }

        // 9. Write outbox event
        await client.query(
          `INSERT INTO outbox_events (
             business_id, event_type, aggregate_type, aggregate_id, payload
           ) VALUES ($1, 'sale.completed', 'sale', $2, $3)`,
          [
            businessId,
            sale.id,
            JSON.stringify({
              saleId: sale.id,
              receiptNumber: sale.receipt_number,
              grandTotal: sale.grand_total,
              itemsCount: processedItems.length,
            }),
          ]
        );

        return {
          saleId: sale.id,
          receiptNumber: sale.receipt_number,
          status: sale.status,
          currency: sale.currency,
          subtotal: DecimalMath.roundTo(sale.subtotal, 2),
          discountTotal: DecimalMath.roundTo(sale.discount_total, 2),
          taxTotal: DecimalMath.roundTo(sale.tax_total, 2),
          grandTotal: DecimalMath.roundTo(sale.grand_total, 2),
          amountPaid: DecimalMath.roundTo(sale.amount_paid, 2),
          changeDue: DecimalMath.roundTo(sale.change_due, 2),
          createdAt: sale.created_at,
          items: processedItems,
        };
      });

      // Update idempotency record to completed
      await this.db.query(
        `UPDATE idempotency_records
         SET status = 'completed', response_status = 200, response_body = $1
         WHERE business_id = $2 AND idempotency_key = $3`,
        [JSON.stringify(result), businessId, idempotencyKey]
      );

      return result;
    } catch (err) {
      await this.db.query(
        `UPDATE idempotency_records
         SET status = 'failed'
         WHERE business_id = $1 AND idempotency_key = $2`,
        [businessId, idempotencyKey]
      ).catch(() => {});
      throw err;
    }
  }

  async getSaleById(businessId: string, saleId: string) {
    const saleRes = await this.db.query(
      `SELECT s.*, u.full_name as cashier_name, b.name as branch_name, r.name as register_name,
              c.name as customer_name, c.phone as customer_phone
       FROM sales s
       JOIN users u ON u.id = s.cashier_id
       JOIN branches b ON b.id = s.branch_id
       JOIN registers r ON r.id = s.register_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.business_id = $1 AND s.id = $2`,
      [businessId, saleId]
    );

    if (saleRes.rows.length === 0) {
      throw new ApiException(ErrorCode.NOT_FOUND, 'Sale record not found.', HttpStatus.NOT_FOUND);
    }
    const sale = saleRes.rows[0];

    const itemsRes = await this.db.query(
      `SELECT si.*,
              COALESCE(
                (SELECT SUM(ri.quantity) FROM return_items ri
                 JOIN returns ret ON ret.id = ri.return_id
                 WHERE ri.original_sale_item_id = si.id AND ret.status IN ('completed', 'approved')),
                0
              ) as returned_quantity
       FROM sale_items si
       WHERE si.business_id = $1 AND si.sale_id = $2`,
      [businessId, saleId]
    );

    const paymentsRes = await this.db.query(
      `SELECT * FROM payments WHERE business_id = $1 AND sale_id = $2`,
      [businessId, saleId]
    );

    return {
      ...sale,
      items: itemsRes.rows.map((it: any) => ({
        ...it,
        returnableQuantity: DecimalMath.subtract(it.quantity, it.returned_quantity),
      })),
      payments: paymentsRes.rows,
    };
  }

  async getSales(
    businessId: string,
    query: { branchId?: string; registerId?: string; cashierId?: string; limit?: number; offset?: number } = {}
  ) {
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const params: any[] = [businessId];
    const conditions = ['s.business_id = $1'];

    if (query.branchId) {
      params.push(query.branchId);
      conditions.push(`s.branch_id = $${params.length}`);
    }
    if (query.registerId) {
      params.push(query.registerId);
      conditions.push(`s.register_id = $${params.length}`);
    }

    params.push(limit, offset);
    const res = await this.db.query(
      `SELECT s.*, u.full_name as cashier_name, b.name as branch_name, r.name as register_name
       FROM sales s
       JOIN users u ON u.id = s.cashier_id
       JOIN branches b ON b.id = s.branch_id
       JOIN registers r ON r.id = s.register_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.rows;
  }
}
