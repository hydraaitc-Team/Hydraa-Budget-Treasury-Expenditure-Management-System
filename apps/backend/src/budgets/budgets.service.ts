import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BudgetTxType, Prisma } from '@prisma/client';

export interface CreateBudgetTxDto {
  financialYearId: number;
  fundingSourceId: number;
  budgetHeadId?: number;
  txType: BudgetTxType;
  amount: number;
  txDate: string;
  orderType?: 'GO' | 'BRO';
  orderNumber?: string;
  orderDate?: string;
  quarter?: string;
  remarks?: string;
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // Get or Create Budget Account
  async getOrCreateAccount(financialYearId: number, fundingSourceId: number, budgetHeadId: number, tx: Prisma.TransactionClient = this.prisma) {
    let account = await tx.budgetAccount.findUnique({
      where: {
        financialYearId_fundingSourceId_budgetHeadId: {
          financialYearId,
          fundingSourceId,
          budgetHeadId,
        },
      },
    });

    if (!account) {
      account = await tx.budgetAccount.create({
        data: {
          financialYearId,
          fundingSourceId,
          budgetHeadId,
        },
      });
    }

    return account;
  }

  // Create Budget Transaction (Release, Additional Release, Initial Allotment, Revised Estimate, etc.)
  async recordTransaction(dto: CreateBudgetTxDto, userId: number, userName: string) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Transaction amount must be strictly greater than zero');
    }

    const txDate = dto.txDate ? new Date(dto.txDate) : new Date();
    const amountDecimal = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Resolve Target Budget Head (defaults to primary head if not provided)
      let headId = dto.budgetHeadId;
      if (!headId) {
        let defaultHead = await tx.budgetHead.findFirst({ orderBy: { id: 'asc' } });
        if (!defaultHead) {
          defaultHead = await tx.budgetHead.create({
            data: {
              code: 'GENERAL_SANCTIONS',
              name: 'General Sanctions & Releases',
              category: 'Operational',
              description: 'General funding release allocation',
            },
          });
        }
        headId = defaultHead.id;
      }

      // Get or create budget account
      const account = await this.getOrCreateAccount(dto.financialYearId, dto.fundingSourceId, headId, tx);

      // 2. Handle Government Order (GO/BRO) if provided
      let govOrderId: number | null = null;
      if (dto.orderNumber) {
        const orderType = dto.orderType || (dto.orderNumber.toUpperCase().includes('BRO') ? 'BRO' : 'GO');
        let go = await tx.governmentOrder.findFirst({
          where: { orderNumber: dto.orderNumber, financialYearId: dto.financialYearId },
        });
        if (!go) {
          go = await tx.governmentOrder.create({
            data: {
              orderType,
              orderNumber: dto.orderNumber,
              orderDate: dto.orderDate ? new Date(dto.orderDate) : txDate,
              financialYearId: dto.financialYearId,
              fundingSourceId: dto.fundingSourceId,
              budgetHeadId: headId,
              amount: amountDecimal,
              quarter: dto.quarter || null,
              remarks: dto.remarks || null,
            },
          });
        }
        govOrderId = go.id;
      }

      // 3. Generate unique transaction number: HYDRAA-BTX-YYYY-XXXXX
      const count = await tx.budgetTransaction.count();
      const txNumber = `HYDRAA-BTX-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

      const rawType = (dto as any).txType || (dto as any).transactionType || 'BUDGET_RELEASE';
      const txType = rawType === 'RELEASE' ? BudgetTxType.BUDGET_RELEASE : (rawType as BudgetTxType);

      // 4. Create Transaction record
      const budgetTx = await tx.budgetTransaction.create({
        data: {
          transactionNumber: txNumber,
          budgetAccountId: account.id,
          financialYearId: dto.financialYearId,
          fundingSourceId: dto.fundingSourceId,
          budgetHeadId: headId,
          governmentOrderId: govOrderId,
          txType,
          amount: amountDecimal,
          txDate,
          remarks: dto.remarks || null,
          createdBy: userName,
        },
      });

      // 5. Update account cached balance & create ledger entry
      let updateData: Prisma.BudgetAccountUpdateInput = {};
      let isLedgerCredit = false;

      switch (dto.txType) {
        case BudgetTxType.INITIAL_ALLOTMENT:
          updateData = { allottedAmount: { increment: amountDecimal } };
          break;

        case BudgetTxType.REVISED_ESTIMATE:
          updateData = { estimatedAmount: amountDecimal };
          break;

        case BudgetTxType.BUDGET_RELEASE:
          updateData = {
            releasedAmount: { increment: amountDecimal },
            unspentBalance: { increment: amountDecimal },
          };
          isLedgerCredit = true;
          break;

        case BudgetTxType.ADDITIONAL_RELEASE:
          // Critical Requirement: Additional release adds to existing balance without replacing previous releases
          updateData = {
            additionalAmount: { increment: amountDecimal },
            releasedAmount: { increment: amountDecimal },
            unspentBalance: { increment: amountDecimal },
          };
          isLedgerCredit = true;
          break;

        case BudgetTxType.OPENING_BALANCE:
          updateData = {
            openingBalance: { increment: amountDecimal },
            unspentBalance: { increment: amountDecimal },
          };
          isLedgerCredit = true;
          break;

        case BudgetTxType.TRANSFER_IN:
          updateData = {
            transfersIn: { increment: amountDecimal },
            unspentBalance: { increment: amountDecimal },
          };
          isLedgerCredit = true;
          break;

        case BudgetTxType.TRANSFER_OUT:
          updateData = {
            transfersOut: { increment: amountDecimal },
            unspentBalance: { decrement: amountDecimal },
          };
          break;
      }

      const updatedAccount = await tx.budgetAccount.update({
        where: { id: account.id },
        data: updateData,
      });

      // Record in immutable ledger
      if (isLedgerCredit) {
        await tx.budgetLedgerEntry.create({
          data: {
            budgetAccountId: account.id,
            budgetTransactionId: budgetTx.id,
            entryType: 'CREDIT',
            amount: amountDecimal,
            balanceAfter: updatedAccount.unspentBalance,
            description: `${dto.txType}: ${dto.remarks || 'Budget credit to ledger'}`,
            entryDate: txDate,
          },
        });
      }

      await this.auditService.log({
        userId,
        action: 'CREATE',
        module: 'BUDGET',
        recordId: String(budgetTx.id),
        details: `Recorded budget transaction ${txNumber} (${dto.txType}) of ₹${dto.amount}`,
        newValues: dto,
      });

      return { transaction: budgetTx, account: updatedAccount };
    });
  }

  // Get Consolidated & Source-wise Budget Summary
  async getBudgetSummary(financialYearId?: number, fundingSourceId?: number) {
    const where: Prisma.BudgetAccountWhereInput = {};
    if (financialYearId) where.financialYearId = financialYearId;
    if (fundingSourceId) where.fundingSourceId = fundingSourceId;

    const accounts = await this.prisma.budgetAccount.findMany({
      where,
      include: {
        financialYear: true,
        fundingSource: true,
        budgetHead: true,
      },
    });

    let totalEstimated = new Prisma.Decimal(0);
    let totalAllotted = new Prisma.Decimal(0);
    let totalReleased = new Prisma.Decimal(0);
    let totalAdditional = new Prisma.Decimal(0);
    let totalExpenditure = new Prisma.Decimal(0);
    let totalUnspent = new Prisma.Decimal(0);

    accounts.forEach((acc) => {
      totalEstimated = totalEstimated.plus(acc.estimatedAmount);
      totalAllotted = totalAllotted.plus(acc.allottedAmount);
      totalReleased = totalReleased.plus(acc.releasedAmount);
      totalAdditional = totalAdditional.plus(acc.additionalAmount);
      totalExpenditure = totalExpenditure.plus(acc.expenditureAmount);
      totalUnspent = totalUnspent.plus(acc.unspentBalance);
    });

    return {
      totals: {
        estimated: totalEstimated.toNumber(),
        allotted: totalAllotted.toNumber(),
        released: totalReleased.toNumber(),
        additional: totalAdditional.toNumber(),
        expenditure: totalExpenditure.toNumber(),
        unspent: totalUnspent.toNumber(),
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        financialYear: a.financialYear.code,
        fundingSource: a.fundingSource.code,
        fundingSourceName: a.fundingSource.name,
        budgetHead: a.budgetHead.name,
        budgetHeadCode: a.budgetHead.code,
        estimated: Number(a.estimatedAmount),
        allotted: Number(a.allottedAmount),
        released: Number(a.releasedAmount),
        additional: Number(a.additionalAmount),
        expenditure: Number(a.expenditureAmount),
        unspent: Number(a.unspentBalance),
      })),
    };
  }

  // Get All Transactions with Filtering
  async getTransactions(filters: {
    financialYearId?: number;
    fundingSourceId?: number;
    budgetHeadId?: number;
    txType?: BudgetTxType;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 25;
    const skip = (page - 1) * limit;

    const where: Prisma.BudgetTransactionWhereInput = {};
    if (filters.financialYearId) where.financialYearId = Number(filters.financialYearId);
    if (filters.fundingSourceId) where.fundingSourceId = Number(filters.fundingSourceId);
    if (filters.budgetHeadId) where.budgetHeadId = Number(filters.budgetHeadId);
    if (filters.txType) where.txType = filters.txType;

    const [total, transactions] = await Promise.all([
      this.prisma.budgetTransaction.count({ where }),
      this.prisma.budgetTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { txDate: 'desc' },
        include: {
          financialYear: true,
          fundingSource: true,
          budgetHead: true,
          governmentOrder: true,
        },
      }),
    ]);

    return { total, page, limit, transactions };
  }
}

