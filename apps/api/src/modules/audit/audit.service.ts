import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface AuditRecordParams {
  businessId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  async log(params: AuditRecordParams): Promise<void> {
    try {
      const sanitizedMeta = this.sanitizeMetadata(params.metadata || {});
      await this.db.query(
        `INSERT INTO audit_logs (
          business_id, actor_user_id, action, entity_type, entity_id, request_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          params.businessId,
          params.actorUserId || null,
          params.action,
          params.entityType,
          params.entityId || null,
          params.requestId || null,
          JSON.stringify(sanitizedMeta),
        ]
      );
    } catch (err) {
      this.logger.error('Failed to write audit log:', err);
    }
  }

  async findByBusiness(businessId: string, limit = 50, offset = 0) {
    const res = await this.db.query(
      `SELECT a.*, u.email as actor_email, u.full_name as actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.business_id = $1
       ORDER BY a.occurred_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, limit, offset]
    );
    return res.rows;
  }

  private sanitizeMetadata(meta: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'secret', 'token', 'cardNumber', 'cvv', 'card_number'];
    const copy: Record<string, any> = {};
    for (const [key, val] of Object.entries(meta)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        copy[key] = '[REDACTED]';
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        copy[key] = this.sanitizeMetadata(val);
      } else {
        copy[key] = val;
      }
    }
    return copy;
  }
}
