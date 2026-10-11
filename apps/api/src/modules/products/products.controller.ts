import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Permissions, CreateProductDto, UpdateProductDto } from '@universal-pos/contracts';

@ApiTags('Products')
@Controller('api/v1/businesses/:businessId/products')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions(Permissions.PRODUCT_CREATE)
  @ApiOperation({ summary: 'Create a new product with optional barcodes' })
  async create(
    @Param('businessId') businessId: string,
    @Body() dto: CreateProductDto
  ) {
    return this.productsService.createProduct(businessId, dto);
  }

  @Get()
  @RequirePermissions(Permissions.PRODUCT_READ)
  @ApiOperation({ summary: 'Search and paginate products' })
  async list(
    @Param('businessId') businessId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0
  ) {
    return this.productsService.getProducts(businessId, {
      search,
      categoryId,
      status,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  @Get('lookup/:barcode')
  @RequirePermissions(Permissions.PRODUCT_READ)
  @ApiOperation({ summary: 'Find product by barcode for rapid checkout scanning' })
  async lookupBarcode(
    @Param('businessId') businessId: string,
    @Param('barcode') barcode: string
  ) {
    return this.productsService.lookupBarcode(businessId, barcode);
  }

  @Get(':id')
  @RequirePermissions(Permissions.PRODUCT_READ)
  @ApiOperation({ summary: 'Get product details by ID' })
  async getOne(
    @Param('businessId') businessId: string,
    @Param('id') id: string
  ) {
    return this.productsService.getProductById(businessId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.PRODUCT_UPDATE)
  @ApiOperation({ summary: 'Update allowed product fields' })
  async update(
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto
  ) {
    return this.productsService.updateProduct(businessId, id, dto);
  }
}
