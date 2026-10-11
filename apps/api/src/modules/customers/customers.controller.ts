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
import { CustomersService } from './customers.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions } from '@universal-pos/contracts';

@ApiTags('Customers')
@Controller('api/v1/businesses/:businessId/customers')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions(Permissions.SALE_READ)
  @ApiOperation({ summary: 'List and search customers' })
  async getCustomers(
    @Param('businessId') businessId: string,
    @Query('search') search?: string
  ) {
    return this.customersService.getCustomers(businessId, search);
  }

  @Post()
  @RequirePermissions(Permissions.SALE_CREATE)
  @ApiOperation({ summary: 'Create new customer' })
  async createCustomer(
    @Param('businessId') businessId: string,
    @Body() dto: { name: string; phone?: string; email?: string; customerCode?: string }
  ) {
    return this.customersService.createCustomer(businessId, dto);
  }
}
