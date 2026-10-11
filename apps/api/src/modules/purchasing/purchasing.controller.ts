import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '@universal-pos/contracts';

@ApiTags('Purchasing')
@Controller('api/v1/businesses/:businessId')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  @Get('suppliers')
  @RequirePermissions(Permissions.PURCHASE_CREATE)
  @ApiOperation({ summary: 'List suppliers' })
  async getSuppliers(@Param('businessId') businessId: string) {
    return this.purchasingService.getSuppliers(businessId);
  }

  @Post('suppliers')
  @RequirePermissions(Permissions.PURCHASE_CREATE)
  @ApiOperation({ summary: 'Create supplier' })
  async createSupplier(
    @Param('businessId') businessId: string,
    @Body() dto: { supplierCode: string; name: string; contactDetails?: Record<string, any> }
  ) {
    return this.purchasingService.createSupplier(businessId, dto);
  }

  @Get('purchase-orders')
  @RequirePermissions(Permissions.PURCHASE_CREATE)
  @ApiOperation({ summary: 'List purchase orders' })
  async getPurchaseOrders(@Param('businessId') businessId: string) {
    return this.purchasingService.getPurchaseOrders(businessId);
  }

  @Post('purchase-orders')
  @RequirePermissions(Permissions.PURCHASE_CREATE)
  @ApiOperation({ summary: 'Create purchase order' })
  async createPurchaseOrder(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: any
  ) {
    return this.purchasingService.createPurchaseOrder(businessId, user.id, dto);
  }

  @Post('goods-receipts')
  @RequirePermissions(Permissions.PURCHASE_RECEIVE)
  @ApiOperation({ summary: 'Receive shipment stock into inventory location' })
  async receiveGoods(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: any
  ) {
    return this.purchasingService.receiveGoods(businessId, user.id, dto);
  }
}
