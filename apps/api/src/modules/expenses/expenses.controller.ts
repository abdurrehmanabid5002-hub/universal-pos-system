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
import { ExpensesService } from './expenses.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '@universal-pos/contracts';

@ApiTags('Expenses')
@Controller('api/v1/businesses/:businessId/expenses')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  @ApiOperation({ summary: 'List recorded store expenses' })
  async getExpenses(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.expensesService.getExpenses(businessId, branchId);
  }

  @Post()
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  @ApiOperation({ summary: 'Record new business expense' })
  async recordExpense(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: any
  ) {
    return this.expensesService.recordExpense(businessId, user.id, dto);
  }
}
