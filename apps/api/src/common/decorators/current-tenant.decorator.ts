import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  businessId: string;
  businessName: string;
  businessType: string;
  defaultCurrency: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  branchIds: string[];
}

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  }
);
