import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode, CreateStockAdjustmentDto } from '@universal-pos/contracts';
import { DecimalMath } from '@universal-pos/shared';

@Injectable()
export class InventoryService {
  constructor(private readonly db: DatabaseService) {}

  async getLocations(businessId: string, branchId?: string) {
    const params: any[] = [businessId];
    let sql = `SELECT l.*, b.name as branch_name
               FROM inventory_locations l
               JOIN branches b ON b.id = l.branch_id
               WHERE l.business_id = $1`;

    if (branchId) {
      params.push(branchId);
      sql += ` AND l.branch_id = $2`;
    }
    sql += ` ORDER BY l.name ASC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createLocation(
    businessId: string,
    dto: { branchId: string; name: string; locationType?: string }
  ) {
    // Verify branch belongs to business
    const b = await this.db.query(
      `SELECT id FROM branches WHERE business_id = $1 AND id = $2`,
      [businessId, dto.branchId]
    );
    if (b.rows.length === 0) {
      throw new ApiException(ErrorCode.NOT_FOUND, 'Branch not found in business.', HttpStatus.NOT_FOUND);
    }

    const res = await this.db.query(
      `INSERT INTO inventory_locations (business_id, branch_id, name, location_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [businessId, dto.branchId, dto.name.trim(), dto.locationType || 'stockroom']
    );
    return res.rows[0];
  }

  async getStockBalances(
    businessId: string,
    query: { branchId?: string; locationId?: string; productId?: string } = {}
  ) {
    const params: any[] = [businessId];
    const conditions = ['b.business_id = $1'];

    if (query.productId) {
      params.push(query.productId);
      conditions.push(`b.product_id = $${params.length}`);
    }
    if (query.locationId) {
      params.push(query.locationId);
      conditions.push(`b.location_id = $${params.length}`);
    }
    if (query.branchId) {
      params.push(query.branchId);
      conditions.push(`l.branch_id = $${params.length}`);
    }

    const res = await this.db.query(
      `SELECT b.*, p.name as product_name, p.sku, l.name as location_name, br.name as branch_name
       FROM inventory_balances b
       JOIN products p ON p.id = b.product_id
       JOIN inventory_locations l ON l.id = b.location_id
       JOIN branches br ON br.id = l.branch_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.name ASC`,
      params
    );

    return res.rows;
  }

  async adjustStock(businessId: string, userId: string, dto: CreateStockAdjustmentDto) {
    return this.db.withTransaction(async (client) => {
      // 1. Verify location & product belong to business
      const locRes = await client.query(
        `SELECT id FROM inventory_locations WHERE business_id = $1 AND id = $2`,
        [businessId, dto.locationId]
      );
      if (locRes.rows.length === 0) {
        throw new ApiException(ErrorCode.NOT_FOUND, 'Inventory location not found.', HttpStatus.NOT_FOUND);
      }

      const prodRes = await client.query(
        `SELECT id, name, sku, cost_price, tracks_inventory FROM products
         WHERE business_id = $1 AND id = $2`,
        [businessId, dto.productId]
      );
      if (prodRes.rows.length === 0) {
        throw new ApiException(ErrorCode.NOT_FOUND, 'Product not found.', HttpStatus.NOT_FOUND);
      }
      const product = prodRes.rows[0];

      // 2. Lock balance row for this product/location
      const balanceRes = await client.query(
        `SELECT id, quantity_on_hand FROM inventory_balances
         WHERE business_id = $1 AND product_id = $2 AND location_id = $3
         FOR UPDATE`,
        [businessId, dto.productId, dto.locationId]
      );

      const currentQty = balanceRes.rows.length > 0 ? balanceRes.rows[0].quantity_on_hand : '0.0000';
      const newQty = DecimalMath.add(currentQty, dto.quantityChange);

      // Check negative stock invariant
      if (DecimalMath.isNegative(newQty)) {
        throw new ApiException(
          ErrorCode.INSUFFICIENT_STOCK,
          `Cannot reduce stock below zero. Current: ${currentQty}, Requested change: ${dto.quantityChange}`,
          HttpStatus.UNPROCESSABLE_ENTITY,
          { productId: dto.productId, currentStock: currentQty, attemptedChange: dto.quantityChange }
        );
      }

      // 3. Upsert balance
      let balanceId: string;
      if (balanceRes.rows.length > 0) {
        balanceId = balanceRes.rows[0].id;
        await client.query(
          `UPDATE inventory_balances
           SET quantity_on_hand = $1, updated_at = now()
           WHERE id = $2`,
          [newQty, balanceId]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO inventory_balances (
             business_id, product_id, location_id, quantity_on_hand, quantity_reserved
           ) VALUES ($1, $2, $3, $4, 0)
           RETURNING id`,
          [businessId, dto.productId, dto.locationId, newQty]
        );
        balanceId = ins.rows[0].id;
      }

      // 4. Append immutable movement record
      const moveRes = await client.query(
        `INSERT INTO inventory_movements (
           business_id, product_id, location_id, movement_type,
           quantity_change, unit_cost, reference_type, created_by
         ) VALUES ($1, $2, $3, 'adjustment', $4, $5, $6, $7)
         RETURNING *`,
        [
          businessId,
          dto.productId,
          dto.locationId,
          dto.quantityChange,
          product.cost_price,
          dto.reason || 'manual_adjustment',
          userId,
        ]
      );

      return {
        product: { id: product.id, sku: product.sku, name: product.name },
        previousQuantity: currentQty,
        newQuantity: newQty,
        movement: moveRes.rows[0],
      };
    });
  }

  async getMovements(
    businessId: string,
    query: { productId?: string; locationId?: string; limit?: number; offset?: number } = {}
  ) {
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const params: any[] = [businessId];
    const conditions = ['m.business_id = $1'];

    if (query.productId) {
      params.push(query.productId);
      conditions.push(`m.product_id = $${params.length}`);
    }
    if (query.locationId) {
      params.push(query.locationId);
      conditions.push(`m.location_id = $${params.length}`);
    }

    params.push(limit, offset);
    const res = await this.db.query(
      `SELECT m.*, p.name as product_name, p.sku, l.name as location_name, u.full_name as created_by_name
       FROM inventory_movements m
       JOIN products p ON p.id = m.product_id
       JOIN inventory_locations l ON l.id = m.location_id
       LEFT JOIN users u ON u.id = m.created_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY m.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.rows;
  }

  async reconcileInventory(businessId: string, productId: string, locationId: string) {
    return this.db.withTransaction(async (client) => {
      // Sum all immutable movements for this product and location
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(quantity_change), 0) as calculated_total
         FROM inventory_movements
         WHERE business_id = $1 AND product_id = $2 AND location_id = $3`,
        [businessId, productId, locationId]
      );
      const calculatedTotal = sumRes.rows[0].calculated_total;

      // Lock current balance
      const balRes = await client.query(
        `SELECT id, quantity_on_hand FROM inventory_balances
         WHERE business_id = $1 AND product_id = $2 AND location_id = $3
         FOR UPDATE`,
        [businessId, productId, locationId]
      );

      const currentBalance = balRes.rows.length > 0 ? balRes.rows[0].quantity_on_hand : '0.0000';
      const difference = DecimalMath.subtract(calculatedTotal, currentBalance);

      if (!DecimalMath.isZero(difference)) {
        // Compensating adjustment
        await client.query(
          `UPDATE inventory_balances
           SET quantity_on_hand = $1, updated_at = now()
           WHERE business_id = $2 AND product_id = $3 AND location_id = $4`,
          [calculatedTotal, businessId, productId, locationId]
        );
      }

      return {
        productId,
        locationId,
        projectedBalance: currentBalance,
        calculatedFromMovements: calculatedTotal,
        reconciledDifference: difference,
        isConsistent: DecimalMath.isZero(difference),
      };
    });
  }
}
