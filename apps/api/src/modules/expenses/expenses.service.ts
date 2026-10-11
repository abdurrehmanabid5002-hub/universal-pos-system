import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';

@Injectable()
export class ExpensesService {
  constructor(private readonly db: DatabaseService) {}

  async getExpenses(businessId: string, branchId?: string) {
    let sql = `SELECT e.*, b.name as branch_name, u.full_name as created_by_name
               FROM expenses e
               JOIN branches b ON b.id = e.branch_id
               JOIN users u ON u.id = e.created_by
               WHERE e.business_id = $1`;
    const params: any[] = [businessId];

    if (branchId) {
      params.push(branchId);
      sql += ` AND e.branch_id = $2`;
    }
    sql += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async recordExpense(
    businessId: string,
    userId: string,
    dto: {
      branchId: string;
      category: string;
      description: string;
      amount: string;
      currency?: string;
      expenseDate?: string;
    }
  ) {
    const res = await this.db.query(
      `INSERT INTO expenses (
         business_id, branch_id, category, description, amount,
         currency, expense_date, status, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'recorded', $8)
       RETURNING *`,
      [
        businessId,
        dto.branchId,
        dto.category.trim(),
        dto.description.trim(),
        dto.amount,
        dto.currency || 'PKR',
        dto.expenseDate || new Date().toISOString().split('T')[0],
        userId,
      ]
    );

    return res.rows[0];
  }
}
