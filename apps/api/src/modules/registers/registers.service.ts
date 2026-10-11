import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';
import { DecimalMath } from '@universal-pos/shared';

@Injectable()
export class RegistersService {
  constructor(private readonly db: DatabaseService) {}

  async getRegisters(businessId: string, branchId?: string) {
    const params: any[] = [businessId];
    let sql = `SELECT r.*, b.name as branch_name,
                      s.id as current_session_id, s.opened_at as session_opened_at,
                      u.full_name as opened_by_name
               FROM registers r
               JOIN branches b ON b.id = r.branch_id
               LEFT JOIN register_sessions s ON s.register_id = r.id AND s.closed_at IS NULL
               LEFT JOIN users u ON u.id = s.opened_by
               WHERE r.business_id = $1`;

    if (branchId) {
      params.push(branchId);
      sql += ` AND r.branch_id = $2`;
    }
    sql += ` ORDER BY r.name ASC`;

    const res = await this.db.query(sql, params);
    return res.rows;
  }

  async createRegister(
    businessId: string,
    dto: { branchId: string; name: string; code: string }
  ) {
    const res = await this.db.query(
      `INSERT INTO registers (business_id, branch_id, name, code, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [businessId, dto.branchId, dto.name.trim(), dto.code.trim().toUpperCase()]
    );
    return res.rows[0];
  }

  async openSession(
    businessId: string,
    userId: string,
    dto: { registerId: string; openingCash: string }
  ) {
    return this.db.withTransaction(async (client) => {
      // 1. Verify register belongs to business
      const reg = await client.query(
        `SELECT id, name FROM registers WHERE business_id = $1 AND id = $2`,
        [businessId, dto.registerId]
      );
      if (reg.rows.length === 0) {
        throw new ApiException(ErrorCode.NOT_FOUND, 'Register not found.', HttpStatus.NOT_FOUND);
      }

      // 2. Check if already open
      const openSess = await client.query(
        `SELECT id FROM register_sessions WHERE register_id = $1 AND closed_at IS NULL`,
        [dto.registerId]
      );
      if (openSess.rows.length > 0) {
        throw new ApiException(
          ErrorCode.REGISTER_ALREADY_OPEN,
          'This register already has an active open session.',
          HttpStatus.CONFLICT
        );
      }

      // 3. Create session
      const sessRes = await client.query(
        `INSERT INTO register_sessions (
           business_id, register_id, opened_by, opening_cash
         ) VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [businessId, dto.registerId, userId, dto.openingCash || '0.0000']
      );
      const session = sessRes.rows[0];

      // 4. Record opening float cash movement
      await client.query(
        `INSERT INTO register_cash_movements (
           business_id, session_id, movement_type, amount, notes, created_by
         ) VALUES ($1, $2, 'opening_float', $3, 'Opening Float', $4)`,
        [businessId, session.id, dto.openingCash || '0.0000', userId]
      );

      return session;
    });
  }

  async getCurrentSession(businessId: string, registerId: string) {
    const sessRes = await this.db.query(
      `SELECT s.*, u.full_name as opened_by_name, r.name as register_name
       FROM register_sessions s
       JOIN registers r ON r.id = s.register_id
       JOIN users u ON u.id = s.opened_by
       WHERE s.business_id = $1 AND s.register_id = $2 AND s.closed_at IS NULL`,
      [businessId, registerId]
    );

    if (sessRes.rows.length === 0) {
      return null;
    }

    const session = sessRes.rows[0];

    // Compute cash breakdown
    const movesRes = await this.db.query(
      `SELECT movement_type, COALESCE(SUM(amount), 0) as total
       FROM register_cash_movements
       WHERE business_id = $1 AND session_id = $2
       GROUP BY movement_type`,
      [businessId, session.id]
    );

    let expectedCash = '0.0000';
    const breakdown: Record<string, string> = {};

    for (const row of movesRes.rows) {
      breakdown[row.movement_type] = row.total;
      if (['opening_float', 'cash_sale', 'pay_in'].includes(row.movement_type)) {
        expectedCash = DecimalMath.add(expectedCash, row.total);
      } else if (['cash_refund', 'pay_out', 'cash_drop'].includes(row.movement_type)) {
        expectedCash = DecimalMath.subtract(expectedCash, row.total);
      }
    }

    return {
      ...session,
      expectedCash,
      cashBreakdown: breakdown,
    };
  }

  async closeSession(
    businessId: string,
    userId: string,
    sessionId: string,
    dto: { closingCash: string }
  ) {
    return this.db.withTransaction(async (client) => {
      const sessRes = await client.query(
        `SELECT * FROM register_sessions
         WHERE business_id = $1 AND id = $2 AND closed_at IS NULL
         FOR UPDATE`,
        [businessId, sessionId]
      );

      if (sessRes.rows.length === 0) {
        throw new ApiException(
          ErrorCode.NOT_FOUND,
          'Active session not found or already closed.',
          HttpStatus.NOT_FOUND
        );
      }
      const session = sessRes.rows[0];

      // Calculate expected cash from recorded cash movements
      const movesRes = await client.query(
        `SELECT movement_type, COALESCE(SUM(amount), 0) as total
         FROM register_cash_movements
         WHERE business_id = $1 AND session_id = $2
         GROUP BY movement_type`,
        [businessId, sessionId]
      );

      let expectedCash = '0.0000';
      for (const row of movesRes.rows) {
        if (['opening_float', 'cash_sale', 'pay_in'].includes(row.movement_type)) {
          expectedCash = DecimalMath.add(expectedCash, row.total);
        } else if (['cash_refund', 'pay_out', 'cash_drop'].includes(row.movement_type)) {
          expectedCash = DecimalMath.subtract(expectedCash, row.total);
        }
      }

      const variance = DecimalMath.subtract(dto.closingCash, expectedCash);

      const updateRes = await client.query(
        `UPDATE register_sessions
         SET closed_by = $1, closed_at = now(),
             closing_cash = $2, expected_cash = $3, variance = $4
         WHERE id = $5
         RETURNING *`,
        [userId, dto.closingCash, expectedCash, variance, sessionId]
      );

      return updateRes.rows[0];
    });
  }

  async recordCashMovement(
    businessId: string,
    userId: string,
    sessionId: string,
    dto: { movementType: string; amount: string; notes?: string }
  ) {
    const sess = await this.db.query(
      `SELECT id FROM register_sessions WHERE business_id = $1 AND id = $2 AND closed_at IS NULL`,
      [businessId, sessionId]
    );
    if (sess.rows.length === 0) {
      throw new ApiException(
        ErrorCode.REGISTER_NOT_OPEN,
        'Cannot record cash movement: session is closed or invalid.',
        HttpStatus.BAD_REQUEST
      );
    }

    const res = await this.db.query(
      `INSERT INTO register_cash_movements (
         business_id, session_id, movement_type, amount, notes, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [businessId, sessionId, dto.movementType, dto.amount, dto.notes || null, userId]
    );

    return res.rows[0];
  }
}
