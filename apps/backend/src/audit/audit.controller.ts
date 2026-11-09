import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_SUPERVISOR, UserRole.AUDITOR_READ_ONLY)
  async getLogs(
    @Query('module') module?: string,
    @Query('recordId') recordId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLogs({ module, recordId, page, limit });
  }
}

