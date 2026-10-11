import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';

@Injectable()
export class IndustryService {
  constructor(private readonly db: DatabaseService) {}

  // 1. Restaurant
  async getTables(businessId: string, branchId?: string) {
    let sql = `SELECT * FROM restaurant_tables WHERE business_id = $1`;
    const params: any[] = [businessId];
    if (branchId) {
      params.push(branchId);
      sql += ` AND branch_id = $2`;
    }
    sql += ` ORDER BY table_number ASC`;
    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createTable(
    businessId: string,
    dto: { branchId: string; tableNumber: string; seatingCapacity?: number }
  ) {
    const res = await this.db.query(
      `INSERT INTO restaurant_tables (business_id, branch_id, table_number, seating_capacity, status)
       VALUES ($1, $2, $3, $4, 'available')
       RETURNING *`,
      [businessId, dto.branchId, dto.tableNumber.trim(), dto.seatingCapacity || 4]
    );
    return res.rows[0];
  }

  // 2. Pharmacy
  async getMedicines(businessId: string) {
    const res = await this.db.query(
      `SELECT pm.*, p.name as product_name, p.sku, p.selling_price
       FROM pharmacy_medicines pm
       JOIN products p ON p.id = pm.product_id
       WHERE pm.business_id = $1`,
      [businessId]
    );
    return res.rows;
  }

  // 3. Electronics
  async getSerials(businessId: string, productId?: string) {
    let sql = `SELECT es.*, p.name as product_name, p.sku
               FROM electronics_serials es
               JOIN products p ON p.id = es.product_id
               WHERE es.business_id = $1`;
    const params: any[] = [businessId];
    if (productId) {
      params.push(productId);
      sql += ` AND es.product_id = $2`;
    }
    const res = await this.db.query(sql, params);
    return res.rows;
  }
}
