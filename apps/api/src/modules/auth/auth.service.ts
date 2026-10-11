import { Injectable, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/errors/api.exception';
import { ErrorCode, RegisterDto, LoginDto } from '@universal-pos/contracts';

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async register(dto: RegisterDto) {
    const existing = await this.db.query(
      `SELECT id FROM users WHERE email = $1`,
      [dto.email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      throw new ApiException(
        ErrorCode.CONFLICT,
        'An account with this email already exists.',
        HttpStatus.CONFLICT
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const txResult = await this.db.withTransaction(async (client) => {
      // 1. Create User
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, email, full_name, status, created_at`,
        [dto.email.toLowerCase().trim(), passwordHash, dto.fullName.trim()]
      );
      const user = userRes.rows[0];

      // 2. If businessName is provided, create initial business and assign Owner role
      let business: any = null;
      if (dto.businessName) {
        const slug = dto.businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

        const bizRes = await client.query(
          `INSERT INTO businesses (name, slug, business_type, default_currency, timezone, status)
           VALUES ($1, $2, 'general_retail', 'PKR', 'Asia/Karachi', 'active')
           RETURNING id, name, slug, business_type, default_currency`,
          [dto.businessName.trim(), slug]
        );
        business = bizRes.rows[0];

        // Fetch Owner role
        const roleRes = await client.query(
          `SELECT id FROM roles WHERE name = 'Owner' AND business_id IS NULL`
        );
        const ownerRoleId = roleRes.rows[0]?.id;

        // Create membership
        const memRes = await client.query(
          `INSERT INTO memberships (business_id, user_id, role_id, status)
           VALUES ($1, $2, $3, 'active')
           RETURNING id`,
          [business.id, user.id, ownerRoleId]
        );
        const membershipId = memRes.rows[0].id;

        // Create default Main branch
        const branchRes = await client.query(
          `INSERT INTO branches (business_id, name, code, status)
           VALUES ($1, 'Main Branch', 'MAIN', 'active')
           RETURNING id`,
          [business.id]
        );
        const branchId = branchRes.rows[0].id;

        // Assign owner membership to Main branch
        await client.query(
          `INSERT INTO branch_memberships (business_id, membership_id, branch_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [business.id, membershipId, branchId]
        );

        // Create default register
        await client.query(
          `INSERT INTO registers (business_id, branch_id, name, code, status)
           VALUES ($1, $2, 'Register 01', 'REG-01', 'active')`,
          [business.id, branchId]
        );

        // Create default inventory location
        await client.query(
          `INSERT INTO inventory_locations (business_id, branch_id, name, location_type)
           VALUES ($1, $2, 'Main Stockroom', 'stockroom')`,
          [business.id, branchId]
        );
      }

      // 3. Create Session
      const session = await this.createSession(client, user.id);

      return {
        user,
        business,
        session,
      };
    });

    const memberships = await this.getUserMemberships(txResult.user.id);

    return {
      user: {
        id: txResult.user.id,
        email: txResult.user.email,
        fullName: txResult.user.full_name || dto.fullName,
        status: txResult.user.status,
        createdAt: txResult.user.created_at,
      },
      business: txResult.business,
      memberships,
      token: txResult.session.token,
      expiresAt: txResult.session.expiresAt,
    };
  }

  async login(dto: LoginDto) {
    const userRes = await this.db.query(
      `SELECT id, email, password_hash, full_name, status
       FROM users WHERE email = $1`,
      [dto.email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      throw new ApiException(
        ErrorCode.UNAUTHENTICATED,
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED
      );
    }

    const user = userRes.rows[0];
    if (user.status !== 'active') {
      throw new ApiException(
        ErrorCode.FORBIDDEN,
        'Your user account has been disabled or suspended.',
        HttpStatus.FORBIDDEN
      );
    }

    const validPassword = await bcrypt.compare(dto.password, user.password_hash);
    if (!validPassword) {
      throw new ApiException(
        ErrorCode.UNAUTHENTICATED,
        'Invalid email or password.',
        HttpStatus.UNAUTHORIZED
      );
    }

    const session = await this.createSession(this.db, user.id);
    const memberships = await this.getUserMemberships(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      },
      memberships,
      token: session.token,
      expiresAt: session.expiresAt,
    };
  }

  async logout(token: string) {
    if (!token) return;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await this.db.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
  }

  async getCurrentUser(userId: string) {
    const userRes = await this.db.query(
      `SELECT id, email, full_name, status, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new ApiException(ErrorCode.NOT_FOUND, 'User not found.', HttpStatus.NOT_FOUND);
    }
    const u = userRes.rows[0];
    const memberships = await this.getUserMemberships(userId);
    return {
      user: {
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        full_name: u.full_name,
        status: u.status,
        createdAt: u.created_at,
      },
      memberships,
    };
  }

  async getUserMemberships(userId: string) {
    const res = await this.db.query(
      `SELECT m.id as membership_id, m.status as membership_status,
              b.id as business_id, b.name as business_name, b.slug as business_slug,
              b.business_type, b.default_currency,
              r.id as role_id, r.name as role_name
       FROM memberships m
       JOIN businesses b ON b.id = m.business_id
       JOIN roles r ON r.id = m.role_id
       WHERE m.user_id = $1 AND b.status = 'active'`,
      [userId]
    );

    const results = [];
    for (const row of res.rows) {
      const perms = await this.db.query(
        `SELECT p.code FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [row.role_id]
      );
      results.push({
        businessId: row.business_id,
        businessName: row.business_name,
        businessSlug: row.business_slug,
        businessType: row.business_type,
        defaultCurrency: row.default_currency,
        membershipStatus: row.membership_status,
        roleName: row.role_name,
        permissions: perms.rows.map((p: any) => p.code),
      });
    }
    return results;
  }

  private async createSession(runner: any, userId: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await runner.query(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );

    return { token: rawToken, expiresAt };
  }
}
