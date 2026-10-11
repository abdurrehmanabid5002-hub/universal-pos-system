import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions } from '@universal-pos/contracts';

@ApiTags('Audit')
@Controller('api/v1/businesses/:businessId/audit-logs')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permissions.AUDIT_READ)
  @ApiOperation({ summary: 'Search and inspect business audit logs' })
  async getAuditLogs(
    @Param('businessId') businessId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0
  ) {
    return this.auditService.findByBusiness(businessId, Number(limit), Number(offset));
  }
}
