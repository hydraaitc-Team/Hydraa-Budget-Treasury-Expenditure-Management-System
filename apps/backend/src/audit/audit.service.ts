import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntryDto {
  userId?: number;
  action: string;
  module: string;
  recordId?: string;
  details?: string;
  previousValues?: any;
  newValues?: any;
  reason?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntryDto) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId || null,
          action: entry.action,
          module: entry.module,
          recordId: entry.recordId ? String(entry.recordId) : null,
          details: entry.details || null,
          previousValues: entry.previousValues ? JSON.stringify(entry.previousValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
          reason: entry.reason || null,
          ipAddress: entry.ipAddress || null,
        },
      });
    } catch (err) {
      console.error('Audit Log failed to write:', err);
    }
  }

  async getLogs(params: { module?: string; recordId?: string; page?: number; limit?: number }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 25;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.module) where.module = params.module;
    if (params.recordId) where.recordId = params.recordId;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, fullName: true, role: true },
          },
        },
      }),
    ]);

    return { total, page, limit, logs };
  }
}

