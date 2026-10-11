import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BusinessesService } from './businesses.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Permissions, CreateBusinessDto, CreateBranchDto } from '@universal-pos/contracts';

@ApiTags('Businesses')
@Controller('api/v1/businesses')
@UseGuards(AuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business organization' })
  async createBusiness(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBusinessDto
  ) {
    return this.businessesService.createBusiness(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List businesses accessible to current user' })
  async listUserBusinesses(@CurrentUser() user: AuthenticatedUser) {
    return this.businessesService.getUserBusinesses(user.id);
  }

  @Get(':businessId')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(Permissions.BUSINESS_READ)
  @ApiOperation({ summary: 'Get business details' })
  async getBusiness(@Param('businessId') businessId: string) {
    return this.businessesService.getBusinessById(businessId);
  }

  @Post(':businessId/branches')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(Permissions.BRANCH_MANAGE)
  @ApiOperation({ summary: 'Create a new branch for business' })
  async createBranch(
    @Param('businessId') businessId: string,
    @Body() dto: CreateBranchDto
  ) {
    return this.businessesService.createBranch(businessId, dto);
  }

  @Get(':businessId/branches')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(Permissions.BRANCH_READ)
  @ApiOperation({ summary: 'List all branches for business' })
  async getBranches(@Param('businessId') businessId: string) {
    return this.businessesService.getBranches(businessId);
  }

  @Post(':businessId/invitations')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(Permissions.EMPLOYEE_INVITE)
  @ApiOperation({ summary: 'Invite or add employee to business' })
  async inviteEmployee(
    @Param('businessId') businessId: string,
    @Body() body: { email: string; roleName: string; branchIds?: string[] }
  ) {
    return this.businessesService.inviteEmployee(businessId, body);
  }

  @Get(':businessId/members')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions(Permissions.EMPLOYEE_MANAGE)
  @ApiOperation({ summary: 'List business staff and roles' })
  async getMembers(@Param('businessId') businessId: string) {
    return this.businessesService.getMembers(businessId);
  }
}
