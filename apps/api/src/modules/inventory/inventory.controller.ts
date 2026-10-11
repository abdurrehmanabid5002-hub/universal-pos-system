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
import { InventoryService } from './inventory.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions, CreateStockAdjustmentDto } from '@universal-pos/contracts';

@ApiTags('Inventory')
@Controller('api/v1/businesses/:businessId/inventory')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('locations')
  @RequirePermissions(Permissions.INVENTORY_READ)
  @ApiOperation({ summary: 'List inventory storage locations' })
  async getLocations(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.inventoryService.getLocations(businessId, branchId);
  }

  @Post('locations')
  @RequirePermissions(Permissions.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Create new inventory storage location' })
  async createLocation(
    @Param('businessId') businessId: string,
    @Body() dto: { branchId: string; name: string; locationType?: string }
  ) {
    return this.inventoryService.createLocation(businessId, dto);
  }

  @Get()
  @RequirePermissions(Permissions.INVENTORY_READ)
  @ApiOperation({ summary: 'Get current inventory balances' })
  async getBalances(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string,
    @Query('locationId') locationId?: string,
    @Query('productId') productId?: string
  ) {
    return this.inventoryService.getStockBalances(businessId, {
      branchId,
      locationId,
      productId,
    });
  }

  @Post('adjustments')
  @RequirePermissions(Permissions.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Execute authorized manual stock adjustment' })
  async adjustStock(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStockAdjustmentDto
  ) {
    return this.inventoryService.adjustStock(businessId, user.id, dto);
  }

  @Get('movements')
  @RequirePermissions(Permissions.INVENTORY_READ)
  @ApiOperation({ summary: 'Inspect immutable stock movement ledger' })
  async getMovements(
    @Param('businessId') businessId: string,
    @Query('productId') productId?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0
  ) {
    return this.inventoryService.getMovements(businessId, {
      productId,
      locationId,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Post('reconcile')
  @RequirePermissions(Permissions.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Reconcile projection balances against immutable movement history' })
  async reconcile(
    @Param('businessId') businessId: string,
    @Body() body: { productId: string; locationId: string }
  ) {
    return this.inventoryService.reconcileInventory(
      businessId,
      body.productId,
      body.locationId
    );
  }
}
