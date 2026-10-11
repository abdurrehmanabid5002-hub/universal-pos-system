import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new owner account and initial business' })
  async register(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(body);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and initialize session' })
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(body);
    this.setSessionCookie(res, result.token, result.expiresAt);
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke session and clear cookies' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    let token = req.cookies?.pos_session;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
        token = parts[1].trim();
      } else if (/^bearer\s+/i.test(authHeader)) {
        token = authHeader.replace(/^bearer\s+/i, '').trim();
      }
    }
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie('pos_session', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current authenticated user and business memberships' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.id);
  }

  private setSessionCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie('pos_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
  }
}
