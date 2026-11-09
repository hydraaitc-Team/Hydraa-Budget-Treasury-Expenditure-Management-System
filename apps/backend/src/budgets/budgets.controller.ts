import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { BudgetsService, CreateBudgetTxDto } from './budgets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, BudgetTxType } from '@prisma/client';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get('summary')
  getSummary(
    @Query('financialYearId') financialYearId?: string,
    @Query('fundingSourceId') fundingSourceId?: string,
  ) {
    return this.budgetsService.getBudgetSummary(
      financialYearId ? Number(financialYearId) : undefined,
      fundingSourceId ? Number(fundingSourceId) : undefined,
    );
  }

  @Get('transactions')
  getTransactions(
    @Query('financialYearId') financialYearId?: string,
    @Query('fundingSourceId') fundingSourceId?: string,
    @Query('budgetHeadId') budgetHeadId?: string,
    @Query('txType') txType?: BudgetTxType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.budgetsService.getTransactions({
      financialYearId: financialYearId ? Number(financialYearId) : undefined,
      fundingSourceId: fundingSourceId ? Number(fundingSourceId) : undefined,
      budgetHeadId: budgetHeadId ? Number(budgetHeadId) : undefined,
      txType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('transactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_DATA_ENTRY)
  recordTransaction(@Body() body: CreateBudgetTxDto, @Req() req: any) {
    return this.budgetsService.recordTransaction(body, req.user.id, req.user.fullName || req.user.username);
  }
}

