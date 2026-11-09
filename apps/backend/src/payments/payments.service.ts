import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BillStatus, Prisma } from '@prisma/client';

export interface SettlementAllocationItem {
  billBudgetAllocationId: number;
  amount: number;
}

export interface RecordSettlementDto {
  billId: number;
  grossSettledAmount: number;
  netPaidToVendor: number;
  deductionsSettled?: number;
  
  // Treasury references
  tokenNumber?: string;
  tokenDate?: string;
  chequeNumber?: string;
  chequeDate?: string;
  utrNumber?: string;
  utrDate?: string;
  paymentDate: string;
  treasuryRemarks?: string;

  // Partial allocations
  allocations?: SettlementAllocationItem[];
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters: {
    billId?: number;
    tokenNumber?: string;
    utrNumber?: string;
    financialYearId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 25;
    const skip = (page - 1) * limit;

    const where: Prisma.BillSettlementWhereInput = {};
    if (filters.billId) where.billId = Number(filters.billId);
    if (filters.tokenNumber) where.tokenNumber = { contains: filters.tokenNumber };
    if (filters.utrNumber) where.utrNumber = { contains: filters.utrNumber };
    if (filters.financialYearId) where.bill = { financialYearId: Number(filters.financialYearId) };

    const [total, settlements] = await Promise.all([
      this.prisma.billSettlement.count({ where }),
      this.prisma.billSettlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          bill: {
            include: { vendor: true, wing: true, financialYear: true },
          },
          settlementAllocations: {
            include: {
              billBudgetAllocation: {
                include: { budgetHead: true, fundingSource: true },
              },
            },
          },
        },
      }),
    ]);

    return { total, page, limit, settlements };
  }

  // Record Payment Settlement & Post to Expenditure
  // Mandatory Rule: Actual expenditure reduces budget ONLY when payment is recorded, not at bill entry.
  async recordSettlement(dto: RecordSettlementDto, userId: number, userName: string) {
    if (dto.grossSettledAmount <= 0) {
      throw new BadRequestException('Settlement gross amount must be greater than zero');
    }

    const paymentDate = new Date(dto.paymentDate);
    const grossDecimal = new Prisma.Decimal(dto.grossSettledAmount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock and fetch bill
      const bill = await tx.bill.findUnique({
        where: { id: dto.billId },
        include: {
          allocations: true,
          financialYear: true,
        },
      });

      if (!bill) throw new NotFoundException('Bill not found');
      if (bill.status === BillStatus.FULLY_PAID) {
        throw new BadRequestException('This bill is already fully settled and paid');
      }

      const balanceDueNum = Number(bill.balanceDue);
      const grossSettledNum = Number(dto.grossSettledAmount);

      if (grossSettledNum > balanceDueNum + 0.01) {
        throw new BadRequestException(`Settlement amount (₹${grossSettledNum}) cannot exceed remaining balance due (₹${balanceDueNum})`);
      }

      // 2. Generate settlement reference: HYDRAA-SETTL-YYYY-XXXXX
      const count = await tx.billSettlement.count();
      const settlementRef = `HYDRAA-SETTL-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

      // 3. Create BillSettlement record
      const settlement = await tx.billSettlement.create({
        data: {
          settlementReference: settlementRef,
          billId: bill.id,
          userId,
          grossSettledAmount: grossDecimal,
          netPaidToVendor: new Prisma.Decimal(dto.netPaidToVendor),
          deductionsSettled: new Prisma.Decimal(dto.deductionsSettled || 0),
          tokenNumber: dto.tokenNumber || null,
          tokenDate: dto.tokenDate ? new Date(dto.tokenDate) : null,
          chequeNumber: dto.chequeNumber || null,
          chequeDate: dto.chequeDate ? new Date(dto.chequeDate) : null,
          utrNumber: dto.utrNumber || null,
          utrDate: dto.utrDate ? new Date(dto.utrDate) : null,
          paymentDate,
          treasuryRemarks: dto.treasuryRemarks || null,
        },
      });

      // 4. Distribute settlement across bill allocations & post to budget ledgers
      let allocDistributions: { allocationId: number; amount: Prisma.Decimal }[] = [];

      if (dto.allocations && dto.allocations.length > 0) {
        // Explicit partial allocation provided
        allocDistributions = dto.allocations.map((a) => ({
          allocationId: a.billBudgetAllocationId,
          amount: new Prisma.Decimal(a.amount),
        }));
      } else {
        // Auto proportional distribution if single or full settlement
        const remainingToDistribute = grossSettledNum;
        let runningDist = 0;

        for (let i = 0; i < bill.allocations.length; i++) {
          const alloc = bill.allocations[i];
          const allocGross = Number(alloc.allocatedAmount);
          const billGross = Number(bill.grossAmount);
          const allocRatio = allocGross / billGross;
          let allocSettled = grossSettledNum * allocRatio;

          if (i === bill.allocations.length - 1) {
            allocSettled = remainingToDistribute - runningDist;
          } else {
            runningDist += allocSettled;
          }

          allocDistributions.push({
            allocationId: alloc.id,
            amount: new Prisma.Decimal(allocSettled),
          });
        }
      }

      // 5. Update budget accounts and insert immutable budget_ledger_entries
      for (const dist of allocDistributions) {
        const alloc = bill.allocations.find((a) => a.id === dist.allocationId);
        if (!alloc) continue;

        // Record settlement allocation
        await tx.billSettlementAllocation.create({
          data: {
            billSettlementId: settlement.id,
            billBudgetAllocationId: alloc.id,
            amount: dist.amount,
          },
        });

        // Update settledAmount on the billBudgetAllocation
        await tx.billBudgetAllocation.update({
          where: { id: alloc.id },
          data: {
            settledAmount: { increment: dist.amount },
          },
        });

        // Update Budget Account (increment actual expenditure, decrement available unspent balance)
        let budgetAccount = await tx.budgetAccount.findUnique({
          where: {
            financialYearId_fundingSourceId_budgetHeadId: {
              financialYearId: bill.financialYearId,
              fundingSourceId: alloc.fundingSourceId,
              budgetHeadId: alloc.budgetHeadId,
            },
          },
        });

        if (!budgetAccount) {
          budgetAccount = await tx.budgetAccount.create({
            data: {
              financialYearId: bill.financialYearId,
              fundingSourceId: alloc.fundingSourceId,
              budgetHeadId: alloc.budgetHeadId,
            },
          });
        }

        const updatedAccount = await tx.budgetAccount.update({
          where: { id: budgetAccount.id },
          data: {
            expenditureAmount: { increment: dist.amount },
            unspentBalance: { decrement: dist.amount },
          },
        });

          // Budget Ledger Entry: DEBIT for expenditure
          await tx.budgetLedgerEntry.create({
            data: {
              budgetAccountId: budgetAccount.id,
              billSettlementId: settlement.id,
              entryType: 'DEBIT',
              amount: dist.amount,
              balanceAfter: updatedAccount.unspentBalance,
              description: `Payment for Bill ${bill.internalBillNo} (Settlement: ${settlementRef}, UTR: ${dto.utrNumber || 'N/A'})`,
              entryDate: paymentDate,
            },
          });
      }

      // 6. Update Bill Status and Paid Amounts
      const newPaidAmount = new Prisma.Decimal(Number(bill.paidAmount) + grossSettledNum);
      const newBalanceDue = new Prisma.Decimal(Number(bill.balanceDue) - grossSettledNum);
      const newStatus = Number(newBalanceDue) <= 0.01 ? BillStatus.FULLY_PAID : BillStatus.PARTIALLY_PAID;

      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      await this.auditService.log({
        userId,
        action: 'PAYMENT',
        module: 'PAYMENTS',
        recordId: String(settlement.id),
        details: `Recorded Settlement ${settlementRef} of ₹${grossSettledNum} for Bill ${bill.internalBillNo} (UTR: ${dto.utrNumber || 'N/A'})`,
        newValues: dto,
      });

      return { settlement, bill: updatedBill };
    });
  }
}
