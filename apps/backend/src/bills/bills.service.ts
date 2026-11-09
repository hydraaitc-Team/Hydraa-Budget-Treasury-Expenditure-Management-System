import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BillStatus, Prisma } from '@prisma/client';

export interface AllocationDto {
  fundingSourceId: number;
  budgetHeadId: number;
  allocatedAmount: number;
}

export interface CreateBillDto {
  financialYearId: number;
  wingId: number;
  vendorId: number;
  billSubject: string;
  billDescription?: string;
  invoiceNo: string;
  invoiceDate: string;
  billReceivedDate?: string;
  billPassedDate?: string;
  grossAmount: number;
  
  // Taxes / Deductions
  igstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  gstCpin?: string;
  gstChallanDate?: string;

  tdsAmount?: number;
  tdsCrn?: string;
  tdsChallanDate?: string;

  otherDeductions?: number;
  remarks?: string;

  // Multiple budget head allocations
  allocations: AllocationDto[];
}

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(filters: {
    financialYearId?: number;
    wingId?: number;
    vendorId?: number;
    status?: BillStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 25;
    const skip = (page - 1) * limit;

    const where: Prisma.BillWhereInput = {};
    if (filters.financialYearId) where.financialYearId = Number(filters.financialYearId);
    if (filters.wingId) where.wingId = Number(filters.wingId);
    if (filters.vendorId) where.vendorId = Number(filters.vendorId);
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { internalBillNo: { contains: filters.search } },
        { invoiceNo: { contains: filters.search } },
        { billSubject: { contains: filters.search } },
        { vendor: { name: { contains: filters.search } } },
      ];
    }

    const [total, bills] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          financialYear: true,
          wing: true,
          vendor: true,
          allocations: {
            include: {
              fundingSource: true,
              budgetHead: true,
            },
          },
          settlements: {
            orderBy: { paymentDate: 'desc' },
          },
        },
      }),
    ]);

    return { total, page, limit, bills };
  }

  async findOne(id: number) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: {
        financialYear: true,
        wing: true,
        vendor: {
          include: { bankAccounts: true },
        },
        allocations: {
          include: {
            fundingSource: true,
            budgetHead: true,
          },
        },
        settlements: {
          include: {
            settlementAllocations: {
              include: {
                billBudgetAllocation: {
                  include: { budgetHead: true, fundingSource: true },
                },
              },
            },
          },
        },
        documents: true,
      },
    });
    if (!bill) throw new NotFoundException('Bill record not found');
    return bill;
  }

  // Create Bill with strict validations
  async createBill(dto: CreateBillDto, userId: number, userName: string) {
    // 1. Validate Gross Amount & Allocations
    if (dto.grossAmount <= 0) {
      throw new BadRequestException('Gross bill amount must be greater than zero');
    }

    if (!dto.allocations || dto.allocations.length === 0) {
      throw new BadRequestException('At least one budget head allocation is required');
    }

    const allocSum = dto.allocations.reduce((acc, curr) => acc + Number(curr.allocatedAmount), 0);
    const grossNum = Number(dto.grossAmount);
    if (Math.abs(allocSum - grossNum) > 0.01) {
      throw new BadRequestException(`Sum of budget head allocations (₹${allocSum}) must exactly equal Gross Bill Amount (₹${grossNum})`);
    }

    // 2. Check for Duplicate Invoice for same vendor in this financial year
    const duplicate = await this.prisma.bill.findFirst({
      where: {
        vendorId: dto.vendorId,
        invoiceNo: dto.invoiceNo.trim(),
        financialYearId: dto.financialYearId,
      },
    });
    if (duplicate) {
      throw new BadRequestException(`Duplicate Invoice Alert: Invoice "${dto.invoiceNo}" for this vendor already recorded under Ref ${duplicate.internalBillNo}`);
    }

    // 3. Calculate Deductions & Net Payable
    const igst = Number(dto.igstAmount || 0);
    const cgst = Number(dto.cgstAmount || 0);
    const sgst = Number(dto.sgstAmount || 0);
    const totalGst = igst + cgst + sgst;
    const tds = Number(dto.tdsAmount || 0);
    const other = Number(dto.otherDeductions || 0);
    const totalDeductions = totalGst + tds + other;
    const netPayable = grossNum - totalDeductions;

    if (netPayable < 0) {
      throw new BadRequestException('Total deductions cannot exceed gross bill amount');
    }

    // 4. Generate Internal Bill Reference Number: HYDRAA-BILL-YYYY-XXXXX
    const count = await this.prisma.bill.count();
    const internalBillNo = `HYDRAA-BILL-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          internalBillNo,
          financialYearId: dto.financialYearId,
          wingId: dto.wingId,
          vendorId: dto.vendorId,
          billSubject: dto.billSubject,
          billDescription: dto.billDescription || null,
          invoiceNo: dto.invoiceNo.trim(),
          invoiceDate: new Date(dto.invoiceDate),
          billReceivedDate: dto.billReceivedDate ? new Date(dto.billReceivedDate) : null,
          billPassedDate: dto.billPassedDate ? new Date(dto.billPassedDate) : null,
          grossAmount: new Prisma.Decimal(grossNum),
          
          igstAmount: new Prisma.Decimal(igst),
          cgstAmount: new Prisma.Decimal(cgst),
          sgstAmount: new Prisma.Decimal(sgst),
          totalGst: new Prisma.Decimal(totalGst),
          gstCpin: dto.gstCpin || null,
          gstChallanDate: dto.gstChallanDate ? new Date(dto.gstChallanDate) : null,

          tdsAmount: new Prisma.Decimal(tds),
          tdsCrn: dto.tdsCrn || null,
          tdsChallanDate: dto.tdsChallanDate ? new Date(dto.tdsChallanDate) : null,

          otherDeductions: new Prisma.Decimal(other),
          totalDeductions: new Prisma.Decimal(totalDeductions),
          netPayableAmount: new Prisma.Decimal(netPayable),

          paidAmount: new Prisma.Decimal(0),
          balanceDue: new Prisma.Decimal(grossNum),
          status: BillStatus.UNPAID,
          remarks: dto.remarks || null,
          createdBy: userName,
        },
      });

      // Insert Allocations
      for (const a of dto.allocations) {
        await tx.billBudgetAllocation.create({
          data: {
            billId: bill.id,
            fundingSourceId: a.fundingSourceId,
            budgetHeadId: a.budgetHeadId,
            allocatedAmount: new Prisma.Decimal(a.allocatedAmount),
          },
        });
      }

      await this.auditService.log({
        userId,
        action: 'CREATE',
        module: 'BILLS',
        recordId: String(bill.id),
        details: `Recorded Bill ${internalBillNo} (Inv: ${bill.invoiceNo}) of ₹${grossNum} (Net: ₹${netPayable})`,
        newValues: dto,
      });

            return tx.bill.findUnique({
        where: { id: bill.id },
        include: {
          allocations: {
            include: { fundingSource: true, budgetHead: true }
          },
          vendor: true,
          wing: true,
          financialYear: true,
        }
      });
    });
  }

  // Optional Record Verification
  async verifyBill(id: number, userId: number, userName: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Bill not found');

    const updated = await this.prisma.bill.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedBy: userName,
        verifiedAt: new Date(),
      },
    });

    await this.auditService.log({
      userId,
      action: 'VERIFY',
      module: 'BILLS',
      recordId: String(id),
      details: `Verified bill ${bill.internalBillNo}`,
    });

    return updated;
  }

  async updateTaxReferences(
    billId: number,
    data: {
      gstCpin?: string;
      gstChallanDate?: string;
      tdsCrn?: string;
      tdsChallanDate?: string;
    },
    userId: number,
    userName: string,
  ) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) throw new NotFoundException(`Bill #${billId} not found`);

    const updated = await this.prisma.bill.update({
      where: { id: billId },
      data: {
        gstCpin: data.gstCpin !== undefined ? (data.gstCpin ? data.gstCpin.trim().toUpperCase() : null) : undefined,
        gstChallanDate: data.gstChallanDate ? new Date(data.gstChallanDate) : (data.gstChallanDate === '' ? null : undefined),
        tdsCrn: data.tdsCrn !== undefined ? (data.tdsCrn ? data.tdsCrn.trim().toUpperCase() : null) : undefined,
        tdsChallanDate: data.tdsChallanDate ? new Date(data.tdsChallanDate) : (data.tdsChallanDate === '' ? null : undefined),
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'BILLS',
      recordId: String(billId),
      details: `Recorded statutory tax references for Bill ${bill.internalBillNo}: GST CPIN=${data.gstCpin || 'N/A'}, TDS CRI=${data.tdsCrn || 'N/A'}`,
    });

    return updated;
  }

  async updateBill(id: number, dto: Partial<CreateBillDto>, userId: number, userName: string) {
    const existing = await this.prisma.bill.findUnique({
      where: { id },
      include: { allocations: true, settlements: true },
    });
    if (!existing) throw new NotFoundException('Bill not found');

    if (existing.status === BillStatus.FULLY_PAID) {
      throw new BadRequestException('Cannot modify a fully settled bill. Reversal of settlements is required.');
    }

    const grossNum = dto.grossAmount !== undefined ? Number(dto.grossAmount) : Number(existing.grossAmount);
    const igst = dto.igstAmount !== undefined ? Number(dto.igstAmount) : Number(existing.igstAmount);
    const cgst = dto.cgstAmount !== undefined ? Number(dto.cgstAmount) : Number(existing.cgstAmount);
    const sgst = dto.sgstAmount !== undefined ? Number(dto.sgstAmount) : Number(existing.sgstAmount);
    const totalGst = igst + cgst + sgst;
    const tds = dto.tdsAmount !== undefined ? Number(dto.tdsAmount) : Number(existing.tdsAmount);
    const other = dto.otherDeductions !== undefined ? Number(dto.otherDeductions) : Number(existing.otherDeductions);
    const totalDeductions = totalGst + tds + other;
    const netPayable = grossNum - totalDeductions;
    const paidAmount = Number(existing.paidAmount);
    const balanceDue = grossNum - paidAmount;

    let newStatus: BillStatus = existing.status;
    if (paidAmount >= grossNum && grossNum > 0) {
      newStatus = BillStatus.FULLY_PAID;
    } else if (paidAmount > 0) {
      newStatus = BillStatus.PARTIALLY_PAID;
    } else {
      newStatus = BillStatus.UNPAID;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bill.update({
        where: { id },
        data: {
          ...(dto.wingId ? { wingId: Number(dto.wingId) } : {}),
          ...(dto.vendorId ? { vendorId: Number(dto.vendorId) } : {}),
          ...(dto.billSubject ? { billSubject: dto.billSubject } : {}),
          ...(dto.billDescription !== undefined ? { billDescription: dto.billDescription || null } : {}),
          ...(dto.invoiceNo ? { invoiceNo: dto.invoiceNo.trim() } : {}),
          ...(dto.invoiceDate ? { invoiceDate: new Date(dto.invoiceDate) } : {}),
          grossAmount: new Prisma.Decimal(grossNum),
          igstAmount: new Prisma.Decimal(igst),
          cgstAmount: new Prisma.Decimal(cgst),
          sgstAmount: new Prisma.Decimal(sgst),
          totalGst: new Prisma.Decimal(totalGst),
          gstCpin: dto.gstCpin !== undefined ? (dto.gstCpin ? dto.gstCpin.trim().toUpperCase() : null) : existing.gstCpin,
          gstChallanDate: dto.gstChallanDate ? new Date(dto.gstChallanDate) : existing.gstChallanDate,
          tdsAmount: new Prisma.Decimal(tds),
          tdsCrn: dto.tdsCrn !== undefined ? (dto.tdsCrn ? dto.tdsCrn.trim().toUpperCase() : null) : existing.tdsCrn,
          tdsChallanDate: dto.tdsChallanDate ? new Date(dto.tdsChallanDate) : existing.tdsChallanDate,
          otherDeductions: new Prisma.Decimal(other),
          totalDeductions: new Prisma.Decimal(totalDeductions),
          netPayableAmount: new Prisma.Decimal(netPayable),
          balanceDue: new Prisma.Decimal(balanceDue),
          status: newStatus,
          ...(dto.remarks !== undefined ? { remarks: dto.remarks || null } : {}),
        },
      });

      // Update allocations if provided
      if (dto.allocations && dto.allocations.length > 0) {
        await tx.billBudgetAllocation.deleteMany({ where: { billId: id } });
        for (const a of dto.allocations) {
          await tx.billBudgetAllocation.create({
            data: {
              billId: id,
              fundingSourceId: Number(a.fundingSourceId),
              budgetHeadId: Number(a.budgetHeadId),
              allocatedAmount: new Prisma.Decimal(a.allocatedAmount),
            },
          });
        }
      }

      await this.auditService.log({
        userId,
        action: 'UPDATE',
        module: 'BILLS',
        recordId: String(id),
        details: `Updated Bill ${existing.internalBillNo} (Inv: ${updated.invoiceNo}) - Gross: ₹${grossNum}`,
      });

      return tx.bill.findUnique({
        where: { id },
        include: {
          allocations: { include: { fundingSource: true, budgetHead: true } },
          vendor: true,
          wing: true,
          financialYear: true,
        },
      });
    });
  }

  async deleteBill(id: number, userId: number, userName: string) {
    const existing = await this.prisma.bill.findUnique({
      where: { id },
      include: { settlements: true, documents: true },
    });
    if (!existing) throw new NotFoundException('Bill not found');

    if (existing.settlements && existing.settlements.length > 0) {
      throw new BadRequestException('Cannot delete Bill because payment settlements have been executed against it.');
    }
    if (Number(existing.paidAmount) > 0) {
      throw new BadRequestException('Cannot delete Bill with paid disbursement history.');
    }

    await this.prisma.$transaction(async (tx) => {
      // Disconnect linked documents
      await tx.document.updateMany({
        where: { billId: id },
        data: { billId: null },
      });
      // Delete allocations
      await tx.billBudgetAllocation.deleteMany({ where: { billId: id } });
      // Delete bill
      await tx.bill.delete({ where: { id } });
    });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      module: 'BILLS',
      recordId: String(id),
      details: `Deleted Bill ${existing.internalBillNo} (Inv: ${existing.invoiceNo})`,
    });

    return { success: true, message: `Bill ${existing.internalBillNo} deleted successfully` };
  }
}

