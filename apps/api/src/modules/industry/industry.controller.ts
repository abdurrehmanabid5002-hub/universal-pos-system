import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IndustryService } from './industry.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions } from '@universal-pos/contracts';

@ApiTags('Industry Extensions')
@Controller('api/v1/businesses/:businessId/industry')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  @Get('restaurant/tables')
  @RequirePermissions(Permissions.SALE_READ)
  @ApiOperation({ summary: 'List restaurant tables' })
  async getTables(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.industryService.getTables(businessId, branchId);
  }

  @Post('restaurant/tables')
  @RequirePermissions(Permissions.BRANCH_MANAGE)
  @ApiOperation({ summary: 'Create restaurant table' })
  async createTable(
    @Param('businessId') businessId: string,
    @Body() dto: { branchId: string; tableNumber: string; seatingCapacity?: number }
  ) {
    return this.industryService.createTable(businessId, dto);
  }

  @Get('pharmacy/medicines')
  @RequirePermissions(Permissions.PRODUCT_READ)
  @ApiOperation({ summary: 'List pharmacy medicines' })
  async getMedicines(@Param('businessId') businessId: string) {
    return this.industryService.getMedicines(businessId);
  }

  @Get('electronics/serials')
  @RequirePermissions(Permissions.PRODUCT_READ)
  @ApiOperation({ summary: 'List electronics serial numbers' })
  async getSerials(
    @Param('businessId') businessId: string,
    @Query('productId') productId?: string
  ) {
    return this.industryService.getSerials(businessId, productId);
  }
}
