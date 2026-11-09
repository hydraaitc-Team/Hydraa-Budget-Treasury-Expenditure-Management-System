import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { PaymentsService, RecordSettlementDto } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(
    @Query('billId') billId?: string,
    @Query('tokenNumber') tokenNumber?: string,
    @Query('utrNumber') utrNumber?: string,
    @Query('financialYearId') financialYearId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAll({
      billId: billId ? Number(billId) : undefined,
      tokenNumber,
      utrNumber,
      financialYearId: financialYearId ? Number(financialYearId) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('settlements')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_DATA_ENTRY)
  recordSettlement(@Body() body: RecordSettlementDto, @Req() req: any) {
    return this.paymentsService.recordSettlement(body, req.user.id, req.user.fullName || req.user.username);
  }
}

