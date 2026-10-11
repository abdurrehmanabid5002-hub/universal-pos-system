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
import { ReturnsService } from './returns.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions, CreateReturnDto } from '@universal-pos/contracts';

@ApiTags('Returns')
@Controller('api/v1/businesses/:businessId/returns')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @RequirePermissions(Permissions.RETURN_CREATE)
  @ApiOperation({ summary: 'Process product return with optional restocking and refund' })
  async processReturn(
    @Param('businessId') businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReturnDto
  ) {
    return this.returnsService.processReturn(businessId, user.id, dto);
  }

  @Get()
  @RequirePermissions(Permissions.SALE_READ)
  @ApiOperation({ summary: 'List return records' })
  async listReturns(
    @Param('businessId') businessId: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0
  ) {
    return this.returnsService.getReturns(businessId, Number(limit), Number(offset));
  }
}
