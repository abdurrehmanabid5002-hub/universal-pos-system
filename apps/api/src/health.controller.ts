import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { DatabaseService } from './database/database.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe verifying DB connectivity' })
  async readiness(@Res({ passthrough: true }) res: Response) {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ready', database: 'connected' };
    } catch (err) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { status: 'unready', database: 'disconnected' };
    }
  }
}
