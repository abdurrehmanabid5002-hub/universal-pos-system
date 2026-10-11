import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;

    if (!user || !user.id) {
      throw new ApiException(
        ErrorCode.UNAUTHENTICATED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED
      );
    }

    // Extract businessId from URL parameter or header
    const businessId =
      request.params?.businessId ||
      (request.headers['x-business-id'] as string);

    if (!businessId) {
      throw new ApiException(
        ErrorCode.BAD_REQUEST,
        'Business scope identifier (businessId) is required.',
        HttpStatus.BAD_REQUEST
      );
    }

    // Query active membership, business status, role and permissions
    const membershipRes = await this.db.query(
      `SELECT m.id as membership_id, m.status as membership_status,
              b.id as business_id, b.name as business_name, b.business_type,
              b.default_currency, b.status as business_status,
              r.id as role_id, r.name as role_name
       FROM memberships m
       JOIN businesses b ON b.id = m.business_id
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND m.business_id = $2`,
      [user.id, businessId]
    );

    if (membershipRes.rows.length === 0) {
      throw new ApiException(
        ErrorCode.FORBIDDEN,
        'Access denied: You are not a member of this business.',
        HttpStatus.FORBIDDEN
      );
    }

    const m = membershipRes.rows[0];
    if (m.business_status !== 'active') {
      throw new ApiException(
        ErrorCode.FORBIDDEN,
        `This business is currently ${m.business_status}.`,
        HttpStatus.FORBIDDEN
      );
    }

    if (m.membership_status !== 'active') {
      throw new ApiException(
        ErrorCode.FORBIDDEN,
        `Your membership in this business is ${m.membership_status}.`,
        HttpStatus.FORBIDDEN
      );
    }

    // Fetch permissions assigned to this role
    const permRes = await this.db.query(
      `SELECT p.code
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [m.role_id]
    );
    const permissions = permRes.rows.map((r: any) => r.code);

    // Fetch assigned branches
    const branchRes = await this.db.query(
      `SELECT branch_id FROM branch_memberships WHERE membership_id = $1`,
      [m.membership_id]
    );
    const branchIds = branchRes.rows.map((r: any) => r.branch_id);

    request.tenant = {
      businessId: m.business_id,
      businessName: m.business_name,
      businessType: m.business_type,
      defaultCurrency: m.default_currency,
      membershipId: m.membership_id,
      roleId: m.role_id,
      roleName: m.role_name,
      permissions,
      branchIds,
    };

    return true;
  }
}
