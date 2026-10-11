import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Extract potential session tokens (prioritizing explicit Bearer header)
    const tokensToCheck: string[] = [];

    const authHeader = request.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^bearer$/i.test(parts[0]) && parts[1].trim()) {
        tokensToCheck.push(parts[1].trim());
      } else if (/^bearer\s+/i.test(authHeader)) {
        const val = authHeader.replace(/^bearer\s+/i, '').trim();
        if (val) tokensToCheck.push(val);
      }
    }

    if (request.cookies?.pos_session) {
      tokensToCheck.push(request.cookies.pos_session.trim());
    }

    if (tokensToCheck.length === 0) {
      throw new ApiException(
        ErrorCode.UNAUTHENTICATED,
        'Authentication required. Please log in.',
        HttpStatus.UNAUTHORIZED
      );
    }

    // 2. Validate token against database sessions (try candidates in priority order)
    let sessionRow: any = null;
    for (const rawToken of tokensToCheck) {
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const sessionRes = await this.db.query(
        `SELECT s.id as session_id, s.user_id, s.expires_at,
                u.id, u.email, u.full_name, u.status
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [tokenHash]
      );

      if (sessionRes.rows.length > 0) {
        sessionRow = sessionRes.rows[0];
        break;
      }
    }

    if (!sessionRow) {
      throw new ApiException(
        ErrorCode.UNAUTHENTICATED,
        'Invalid or expired session. Please log in again.',
        HttpStatus.UNAUTHORIZED
      );
    }

    const row = sessionRow;
    if (row.status !== 'active') {
      throw new ApiException(
        ErrorCode.FORBIDDEN,
        'Your user account is suspended or disabled.',
        HttpStatus.FORBIDDEN
      );
    }

    // Update last_active_at asynchronously
    this.db.query(
      `UPDATE sessions SET last_active_at = now() WHERE id = $1`,
      [row.session_id]
    ).catch(() => {});

    request.user = {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      status: row.status,
    };

    return true;
  }
}
