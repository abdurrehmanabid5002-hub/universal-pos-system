import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions, CreateCategoryDto } from '@universal-pos/contracts';

@ApiTags('Categories')
@Controller('api/v1/businesses/:businessId/categories')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequirePermissions(Permissions.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Create a new category in business' })
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateCategoryDto
  ) {
    return this.categoriesService.createCategory(businessId, dto);
  }

  @Get()
  @RequirePermissions(Permissions.PRODUCT_READ)
  @ApiOperation({ summary: 'List all categories in business' })
  async list(@Param('businessId') businessId: string) {
    return this.categoriesService.getCategories(businessId);
  }
}
