import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionCode } from '@universal-pos/contracts';
import { ApiException } from '../errors/api.exception';
import { ErrorCode } from '@universal-pos/contracts';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;

    if (!tenant) {
      throw new ApiException(
        ErrorCode.FORBIDDEN,
        'Tenant context missing for permissions check',
        HttpStatus.FORBIDDEN
      );
    }

    // Business Owner has all privileges
    if (tenant.roleName === 'Owner') {
      return true;
    }

    const hasAll = requiredPermissions.every((perm) =>
      tenant.permissions.includes(perm)
    );

    if (!hasAll) {
      throw new ApiException(
        ErrorCode.FORBIDDEN,
        `Forbidden: Missing required permission(s): ${requiredPermissions.join(', ')}`,
        HttpStatus.FORBIDDEN,
        { requiredPermissions, userPermissions: tenant.permissions }
      );
    }

    return true;
  }
}
