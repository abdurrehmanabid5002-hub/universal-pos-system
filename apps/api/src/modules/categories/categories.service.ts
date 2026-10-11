import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode, CreateCategoryDto } from '@universal-pos/contracts';

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  async createCategory(businessId: string, dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.db.query(
        `SELECT id FROM categories WHERE business_id = $1 AND id = $2`,
        [businessId, dto.parentId]
      );
      if (parent.rows.length === 0) {
        throw new ApiException(
          ErrorCode.NOT_FOUND,
          'Parent category not found in this business.',
          HttpStatus.NOT_FOUND
        );
      }
    }

    const res = await this.db.query(
      `INSERT INTO categories (business_id, parent_id, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [businessId, dto.parentId || null, dto.name.trim(), dto.description || null]
    );
    return res.rows[0];
  }

  async getCategories(businessId: string) {
    const res = await this.db.query(
      `SELECT * FROM categories WHERE business_id = $1 ORDER BY name ASC`,
      [businessId]
    );
    return res.rows;
  }
}
