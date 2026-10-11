import { Injectable, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode, CreateBusinessDto, CreateBranchDto } from '@universal-pos/contracts';

@Injectable()
export class BusinessesService {
  constructor(private readonly db: DatabaseService) {}

  async createBusiness(userId: string, dto: CreateBusinessDto) {
    const slug =
      (dto.slug || dto.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

    return this.db.withTransaction(async (client) => {
      const bizRes = await client.query(
        `INSERT INTO businesses (name, slug, business_type, default_currency, timezone, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         RETURNING id, name, slug, business_type, default_currency, timezone, created_at`,
        [
          dto.name.trim(),
          slug,
          dto.businessType || 'general_retail',
          dto.defaultCurrency || 'PKR',
          dto.timezone || 'Asia/Karachi',
        ]
      );
      const business = bizRes.rows[0];

      // Assign Owner role
      const roleRes = await client.query(
        `SELECT id FROM roles WHERE name = 'Owner' AND business_id IS NULL`
      );
      const ownerRoleId = roleRes.rows[0]?.id;

      await client.query(
        `INSERT INTO memberships (business_id, user_id, role_id, status)
         VALUES ($1, $2, $3, 'active')`,
        [business.id, userId, ownerRoleId]
      );

      // Create default Branch
      const branchRes = await client.query(
        `INSERT INTO branches (business_id, name, code, status)
         VALUES ($1, 'Main Branch', 'MAIN', 'active')
         RETURNING id`,
        [business.id]
      );
      const branchId = branchRes.rows[0].id;

      // Create default Register
      await client.query(
        `INSERT INTO registers (business_id, branch_id, name, code, status)
         VALUES ($1, $2, 'Register 01', 'REG-01', 'active')`,
        [business.id, branchId]
      );

      // Create default Stockroom
      await client.query(
        `INSERT INTO inventory_locations (business_id, branch_id, name, location_type)
         VALUES ($1, $2, 'Main Stockroom', 'stockroom')`,
        [business.id, branchId]
      );

      return business;
    });
  }

  async getUserBusinesses(userId: string) {
    const res = await this.db.query(
      `SELECT b.*, r.name as role_name, m.status as membership_status
       FROM memberships m
       JOIN businesses b ON b.id = m.business_id
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND b.status = 'active'`,
      [userId]
    );
    return res.rows;
  }

  async getBusinessById(businessId: string) {
    const res = await this.db.query(
      `SELECT * FROM businesses WHERE id = $1`,
      [businessId]
    );
    if (res.rows.length === 0) {
      throw new ApiException(ErrorCode.NOT_FOUND, 'Business not found.', HttpStatus.NOT_FOUND);
    }
    return res.rows[0];
  }

  async createBranch(businessId: string, dto: CreateBranchDto) {
    const existing = await this.db.query(
      `SELECT id FROM branches WHERE business_id = $1 AND code = $2`,
      [businessId, dto.code.trim().toUpperCase()]
    );
    if (existing.rows.length > 0) {
      throw new ApiException(
        ErrorCode.CONFLICT,
        `Branch code ${dto.code} already exists for this business.`,
        HttpStatus.CONFLICT
      );
    }

    return this.db.withTransaction(async (client) => {
      const branchRes = await client.query(
        `INSERT INTO branches (business_id, name, code, address, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING *`,
        [
          businessId,
          dto.name.trim(),
          dto.code.trim().toUpperCase(),
          JSON.stringify(dto.address || {}),
        ]
      );
      const branch = branchRes.rows[0];

      // Automatically create a default register for this branch
      await client.query(
        `INSERT INTO registers (business_id, branch_id, name, code, status)
         VALUES ($1, $2, $3, 'REG-01', 'active')`,
        [businessId, branch.id, `${branch.name} Register 01`]
      );

      // Automatically create a default location for this branch
      await client.query(
        `INSERT INTO inventory_locations (business_id, branch_id, name, location_type)
         VALUES ($1, $2, $3, 'stockroom')`,
        [businessId, branch.id, `${branch.name} Stockroom`]
      );

      return branch;
    });
  }

  async getBranches(businessId: string) {
    const res = await this.db.query(
      `SELECT * FROM branches WHERE business_id = $1 ORDER BY created_at ASC`,
      [businessId]
    );
    return res.rows;
  }

  async inviteEmployee(businessId: string, body: { email: string; roleName: string; branchIds?: string[] }) {
    // 1. Check if user exists, if not create placeholder pending user
    let userRes = await this.db.query(`SELECT id FROM users WHERE email = $1`, [body.email.toLowerCase().trim()]);
    let userId: string;

    if (userRes.rows.length === 0) {
      const newUser = await this.db.query(
        `INSERT INTO users (email, full_name, status)
         VALUES ($1, $2, 'pending')
         RETURNING id`,
        [body.email.toLowerCase().trim(), body.email.split('@')[0]]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userRes.rows[0].id;
    }

    // 2. Fetch role
    const roleRes = await this.db.query(
      `SELECT id FROM roles
       WHERE name = $1 AND (business_id = $2 OR business_id IS NULL)
       LIMIT 1`,
      [body.roleName, businessId]
    );
    if (roleRes.rows.length === 0) {
      throw new ApiException(ErrorCode.BAD_REQUEST, `Invalid role: ${body.roleName}`, HttpStatus.BAD_REQUEST);
    }
    const roleId = roleRes.rows[0].id;

    // 3. Upsert membership
    return this.db.withTransaction(async (client) => {
      const memRes = await client.query(
        `INSERT INTO memberships (business_id, user_id, role_id, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (business_id, user_id)
         DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active'
         RETURNING id`,
        [businessId, userId, roleId]
      );
      const membershipId = memRes.rows[0].id;

      // Link branch memberships if provided
      if (body.branchIds && body.branchIds.length > 0) {
        for (const branchId of body.branchIds) {
          await client.query(
            `INSERT INTO branch_memberships (business_id, membership_id, branch_id)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [businessId, membershipId, branchId]
          );
        }
      }

      return { membershipId, userId, roleName: body.roleName };
    });
  }

  async getMembers(businessId: string) {
    const res = await this.db.query(
      `SELECT m.id as membership_id, m.status, m.created_at,
              u.id as user_id, u.email, u.full_name,
              r.name as role_name
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       JOIN roles r ON r.id = m.role_id
       WHERE m.business_id = $1`,
      [businessId]
    );
    return res.rows;
  }
}
