import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions, CheckoutSaleDto } from '@universal-pos/contracts';

@ApiTags('Sales')
@Controller('api/v1/businesses/:businessId/sales')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @RequirePermissions(Permissions.SALE_CREATE)
  @ApiOperation({ summary: 'Execute checkout and process sale with Idempotency-Key' })
  async checkout(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CheckoutSaleDto
  ) {
    return this.salesService.checkout(businessId, user.id, idempotencyKey, dto);
  }

  @Get()
  @RequirePermissions(Permissions.SALE_READ)
  @ApiOperation({ summary: 'List sales history' })
  async listSales(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string,
    @Query('registerId') registerId?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0
  ) {
    return this.salesService.getSales(businessId, {
      branchId,
      registerId,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get(':id')
  @RequirePermissions(Permissions.SALE_READ)
  @ApiOperation({ summary: 'Get full sale and receipt detail' })
  async getSale(
    @Param('businessId') businessId: string,
    @Param('id') id: string
  ) {
    return this.salesService.getSaleById(businessId, id);
  }
}
