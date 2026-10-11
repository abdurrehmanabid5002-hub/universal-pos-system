import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode, CreateProductDto, UpdateProductDto } from '@universal-pos/contracts';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async createProduct(businessId: string, dto: CreateProductDto) {
    // 1. Verify category belongs to business if provided
    if (dto.categoryId) {
      const cat = await this.db.query(
        `SELECT id FROM categories WHERE business_id = $1 AND id = $2`,
        [businessId, dto.categoryId]
      );
      if (cat.rows.length === 0) {
        throw new ApiException(
          ErrorCode.NOT_FOUND,
          'Specified category does not belong to this business.',
          HttpStatus.NOT_FOUND
        );
      }
    }

    // 2. Check SKU uniqueness in business
    const existingSku = await this.db.query(
      `SELECT id FROM products WHERE business_id = $1 AND sku = $2`,
      [businessId, dto.sku.trim()]
    );
    if (existingSku.rows.length > 0) {
      throw new ApiException(
        ErrorCode.CONFLICT,
        `SKU "${dto.sku}" is already in use in this business.`,
        HttpStatus.CONFLICT
      );
    }

    return this.db.withTransaction(async (client) => {
      // 3. Insert product
      const prodRes = await client.query(
        `INSERT INTO products (
          business_id, category_id, sku, name, product_type, base_unit,
          cost_price, selling_price, tracks_inventory, status, attributes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10)
        RETURNING *`,
        [
          businessId,
          dto.categoryId || null,
          dto.sku.trim(),
          dto.name.trim(),
          dto.productType || 'stock',
          dto.baseUnit || 'piece',
          dto.costPrice || '0.0000',
          dto.sellingPrice || '0.0000',
          dto.tracksInventory !== false,
          JSON.stringify(dto.attributes || {}),
        ]
      );
      const product = prodRes.rows[0];

      // 4. Attach barcodes
      if (dto.barcodes && dto.barcodes.length > 0) {
        for (const barcode of dto.barcodes) {
          await client.query(
            `INSERT INTO product_barcodes (business_id, product_id, barcode, barcode_type)
             VALUES ($1, $2, $3, 'standard')
             ON CONFLICT (business_id, barcode) DO NOTHING`,
            [businessId, product.id, barcode.trim()]
          );
        }
      }

      return {
        ...product,
        barcodes: dto.barcodes || [],
      };
    });
  }

  async getProducts(
    businessId: string,
    query: {
      search?: string;
      categoryId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const conditions: string[] = ['p.business_id = $1'];
    const params: any[] = [businessId];

    if (query.status) {
      params.push(query.status);
      conditions.push(`p.status = $${params.length}`);
    } else {
      conditions.push(`p.status != 'archived'`);
    }

    if (query.categoryId) {
      params.push(query.categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      const sIdx = params.length;
      conditions.push(`(lower(p.name) LIKE $${sIdx} OR lower(p.sku) LIKE $${sIdx} OR pb.barcode LIKE $${sIdx})`);
    }

    const whereClause = conditions.join(' AND ');

    const countRes = await this.db.query(
      `SELECT COUNT(DISTINCT p.id) as total
       FROM products p
       LEFT JOIN product_barcodes pb ON pb.product_id = p.id AND pb.business_id = p.business_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataRes = await this.db.query(
      `SELECT p.*, c.name as category_name,
              COALESCE(SUM(b.quantity_on_hand), 0) as total_stock,
              COALESCE(array_agg(DISTINCT pb.barcode) FILTER (WHERE pb.barcode IS NOT NULL), '{}') as barcodes
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_barcodes pb ON pb.product_id = p.id AND pb.business_id = p.business_id
       LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.business_id = p.business_id
       WHERE ${whereClause}
       GROUP BY p.id, c.name
       ORDER BY p.name ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    return {
      items: dataRes.rows,
      total,
      limit,
      offset,
    };
  }

  async getProductById(businessId: string, productId: string) {
    const res = await this.db.query(
      `SELECT p.*, c.name as category_name,
              COALESCE(SUM(b.quantity_on_hand), 0) as total_stock,
              COALESCE(array_agg(DISTINCT pb.barcode) FILTER (WHERE pb.barcode IS NOT NULL), '{}') as barcodes
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_barcodes pb ON pb.product_id = p.id AND pb.business_id = p.business_id
       LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.business_id = p.business_id
       WHERE p.business_id = $1 AND p.id = $2
       GROUP BY p.id, c.name`,
      [businessId, productId]
    );

    if (res.rows.length === 0) {
      throw new ApiException(ErrorCode.NOT_FOUND, 'Product not found.', HttpStatus.NOT_FOUND);
    }
    return res.rows[0];
  }

  async updateProduct(businessId: string, productId: string, dto: UpdateProductDto) {
    const existing = await this.getProductById(businessId, productId);

    const fields: string[] = ['updated_at = now()'];
    const params: any[] = [businessId, productId];

    if (dto.name !== undefined) {
      params.push(dto.name.trim());
      fields.push(`name = $${params.length}`);
    }
    if (dto.categoryId !== undefined) {
      params.push(dto.categoryId);
      fields.push(`category_id = $${params.length}`);
    }
    if (dto.costPrice !== undefined) {
      params.push(dto.costPrice);
      fields.push(`cost_price = $${params.length}`);
    }
    if (dto.sellingPrice !== undefined) {
      params.push(dto.sellingPrice);
      fields.push(`selling_price = $${params.length}`);
    }
    if (dto.status !== undefined) {
      params.push(dto.status);
      fields.push(`status = $${params.length}`);
    }
    if (dto.attributes !== undefined) {
      params.push(JSON.stringify(dto.attributes));
      fields.push(`attributes = $${params.length}`);
    }

    const res = await this.db.query(
      `UPDATE products
       SET ${fields.join(', ')}
       WHERE business_id = $1 AND id = $2
       RETURNING *`,
      params
    );

    return res.rows[0];
  }

  async lookupBarcode(businessId: string, barcode: string) {
    const res = await this.db.query(
      `SELECT p.*, c.name as category_name,
              COALESCE(SUM(b.quantity_on_hand), 0) as total_stock,
              array_agg(DISTINCT pb.barcode) as barcodes
       FROM product_barcodes pb
       JOIN products p ON p.id = pb.product_id AND p.business_id = pb.business_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN inventory_balances b ON b.product_id = p.id AND b.business_id = p.business_id
       WHERE pb.business_id = $1 AND pb.barcode = $2 AND p.status = 'active'
       GROUP BY p.id, c.name`,
      [businessId, barcode.trim()]
    );

    if (res.rows.length === 0) {
      throw new ApiException(
        ErrorCode.NOT_FOUND,
        `No product found for barcode: ${barcode}`,
        HttpStatus.NOT_FOUND
      );
    }

    return res.rows[0];
  }
}
