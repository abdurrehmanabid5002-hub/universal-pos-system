import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';

@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}

  async getCustomers(businessId: string, search?: string) {
    let sql = `SELECT * FROM customers WHERE business_id = $1`;
    const params: any[] = [businessId];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      sql += ` AND (lower(name) LIKE $2 OR lower(customer_code) LIKE $2 OR phone LIKE $2)`;
    }
    sql += ` ORDER BY name ASC LIMIT 100`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createCustomer(
    businessId: string,
    dto: { name: string; phone?: string; email?: string; customerCode?: string }
  ) {
    const customerCode =
      dto.customerCode ||
      `CUST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const res = await this.db.query(
      `INSERT INTO customers (business_id, customer_code, name, phone, email, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [businessId, customerCode, dto.name.trim(), dto.phone || null, dto.email || null]
    );

    return res.rows[0];
  }
}
