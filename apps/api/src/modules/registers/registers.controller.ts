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
import { RegistersService } from './registers.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '@universal-pos/contracts';

@ApiTags('Registers')
@Controller('api/v1/businesses/:businessId/registers')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class RegistersController {
  constructor(private readonly registersService: RegistersService) {}

  @Get()
  @RequirePermissions(Permissions.SALE_READ)
  @ApiOperation({ summary: 'List registers and active session statuses' })
  async list(
    @Param('businessId') businessId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.registersService.getRegisters(businessId, branchId);
  }

  @Post()
  @RequirePermissions(Permissions.BRANCH_MANAGE)
  @ApiOperation({ summary: 'Create a new register' })
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: { branchId: string; name: string; code: string }
  ) {
    return this.registersService.createRegister(businessId, dto);
  }

  @Post('open')
  @RequirePermissions(Permissions.SALE_CREATE)
  @ApiOperation({ summary: 'Open a register session with starting cash float' })
  async openSession(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { registerId: string; openingCash: string }
  ) {
    return this.registersService.openSession(businessId, user.id, dto);
  }

  @Get(':registerId/current-session')
  @RequirePermissions(Permissions.SALE_READ)
  @ApiOperation({ summary: 'Get active session details and reconciled expected cash' })
  async getCurrentSession(
    @Param('businessId') businessId: string,
    @Param('registerId') registerId: string
  ) {
    return this.registersService.getCurrentSession(businessId, registerId);
  }

  @Post('sessions/:sessionId/close')
  @RequirePermissions(Permissions.SALE_CREATE)
  @ApiOperation({ summary: 'Close register session and calculate cash variance' })
  async closeSession(
    @Param('businessId') businessId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { closingCash: string }
  ) {
    return this.registersService.closeSession(businessId, user.id, sessionId, dto);
  }

  @Post('sessions/:sessionId/cash-movement')
  @RequirePermissions(Permissions.SALE_CREATE)
  @ApiOperation({ summary: 'Record cash drop, pay-in, or pay-out' })
  async cashMovement(
    @Param('businessId') businessId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { movementType: string; amount: string; notes?: string }
  ) {
    return this.registersService.recordCashMovement(
      businessId,
      user.id,
      sessionId,
      dto
    );
  }
}
