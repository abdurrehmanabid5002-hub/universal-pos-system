import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions } from '@universal-pos/contracts';

@ApiTags('Reports')
@Controller('api/v1/businesses/:businessId/reports')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @RequirePermissions(Permissions.REPORT_SALES_READ)
  @ApiOperation({ summary: 'Get sales and revenue performance report' })
  async getSalesReport(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    return this.reportsService.getSalesReport(businessId, {
      branchId,
      fromDate,
      toDate,
    });
  }

  @Get('inventory')
  @RequirePermissions(Permissions.REPORT_INVENTORY_READ)
  @ApiOperation({ summary: 'Get inventory valuation and low stock report' })
  async getInventoryReport(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.reportsService.getInventoryReport(businessId, branchId);
  }

  @Get('profit')
  @RequirePermissions(Permissions.REPORT_PROFIT_READ)
  @ApiOperation({ summary: 'Get authoritative gross and net profit margin report' })
  async getProfitReport(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    return this.reportsService.getProfitReport(businessId, {
      branchId,
      fromDate,
      toDate,
    });
  }
}
