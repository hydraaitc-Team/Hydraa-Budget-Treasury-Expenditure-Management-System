import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // -------------------------------------------------------------
  // 1. FINANCIAL YEARS
  // -------------------------------------------------------------
  async getFinancialYears() {
    return this.prisma.financialYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async createFinancialYear(data: { code: string; name: string; startDate: string; endDate: string; isCurrent?: boolean }, userId: number) {
    const existing = await this.prisma.financialYear.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException(`Financial Year ${data.code} already exists`);

    if (data.isCurrent) {
      await this.prisma.financialYear.updateMany({ data: { isCurrent: false } });
    }

    const fy = await this.prisma.financialYear.create({
      data: {
        code: data.code,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: Boolean(data.isCurrent),
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      module: 'MASTERS_FY',
      recordId: String(fy.id),
      details: `Created Financial Year ${fy.code}`,
    });

    return fy;
  }

  async updateFinancialYear(id: number, data: { code?: string; name?: string; startDate?: string; endDate?: string; isCurrent?: boolean }, userId: number) {
    const existing = await this.prisma.financialYear.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Financial Year #${id} not found`);

    if (data.code && data.code !== existing.code) {
      const duplicate = await this.prisma.financialYear.findUnique({ where: { code: data.code } });
      if (duplicate) throw new BadRequestException(`Financial Year code ${data.code} already exists`);
    }

    if (data.isCurrent) {
      await this.prisma.financialYear.updateMany({ data: { isCurrent: false } });
    }

    const updated = await this.prisma.financialYear.update({
      where: { id },
      data: {
        ...(data.code ? { code: data.code } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.isCurrent !== undefined ? { isCurrent: Boolean(data.isCurrent) } : {}),
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'MASTERS_FY',
      recordId: String(id),
      details: `Updated Financial Year ${updated.code} timeline and settings`,
    });

    return updated;
  }

  async deleteFinancialYear(id: number, userId: number) {
    const existing = await this.prisma.financialYear.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Financial Year #${id} not found`);

    if (existing.isCurrent) {
      throw new BadRequestException('Cannot delete the currently active Financial Year. Please designate another year as active first.');
    }

    const [billsCount, budgetsCount] = await Promise.all([
      this.prisma.bill.count({ where: { financialYearId: id } }),
      this.prisma.budgetAccount.count({ where: { financialYearId: id } }),
    ]);

    if (billsCount > 0 || budgetsCount > 0) {
      throw new BadRequestException(`Cannot delete Financial Year ${existing.code} because it contains active bills (${billsCount}) or budgets (${budgetsCount}).`);
    }

    await this.prisma.financialYear.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      module: 'MASTERS_FY',
      recordId: String(id),
      details: `Deleted Financial Year ${existing.code}`,
    });

    return { success: true, message: `Financial Year ${existing.code} deleted successfully` };
  }

  async setCurrentFinancialYear(id: number, userId: number) {
    await this.prisma.$transaction([
      this.prisma.financialYear.updateMany({ data: { isCurrent: false } }),
      this.prisma.financialYear.update({ where: { id }, data: { isCurrent: true } }),
    ]);

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'MASTERS_FY',
      recordId: String(id),
      details: `Set Financial Year ID ${id} as Current Active Year`,
    });

    return { success: true };
  }

  // -------------------------------------------------------------
  // 2. FUNDING SOURCES
  // -------------------------------------------------------------
  async getFundingSources() {
    return this.prisma.fundingSource.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createFundingSource(data: { code: string; name: string; description?: string }, userId: number) {
    const existing = await this.prisma.fundingSource.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException(`Funding source ${data.code} already exists`);

    const fs = await this.prisma.fundingSource.create({ data });
    await this.auditService.log({
      userId,
      action: 'CREATE',
      module: 'MASTERS_FUNDING_SOURCE',
      recordId: String(fs.id),
      details: `Created funding source ${fs.code} (${fs.name})`,
    });
    return fs;
  }

  async updateFundingSource(id: number, data: { code?: string; name?: string; description?: string }, userId: number) {
    const existing = await this.prisma.fundingSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Funding Source #${id} not found`);

    if (data.code && data.code !== existing.code) {
      const duplicate = await this.prisma.fundingSource.findUnique({ where: { code: data.code } });
      if (duplicate) throw new BadRequestException(`Funding source code ${data.code} already exists`);
    }

    const updated = await this.prisma.fundingSource.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'MASTERS_FUNDING_SOURCE',
      recordId: String(id),
      details: `Updated funding source ${updated.code} details`,
    });

    return updated;
  }

  async deleteFundingSource(id: number, userId: number) {
    const existing = await this.prisma.fundingSource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Funding Source #${id} not found`);

    const [budgetCount, billAllocCount] = await Promise.all([
      this.prisma.budgetAccount.count({ where: { fundingSourceId: id } }),
      this.prisma.billBudgetAllocation.count({ where: { fundingSourceId: id } }),
    ]);

    if (budgetCount > 0 || billAllocCount > 0) {
      throw new BadRequestException(`Cannot delete Funding Source ${existing.code} because it has associated budgets (${budgetCount}) or bill allocations (${billAllocCount}).`);
    }

    await this.prisma.fundingSource.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      module: 'MASTERS_FUNDING_SOURCE',
      recordId: String(id),
      details: `Deleted funding source ${existing.code}`,
    });

    return { success: true, message: `Funding source ${existing.code} deleted successfully` };
  }

  // -------------------------------------------------------------
  // 3. WINGS
  // -------------------------------------------------------------
  async getWings() {
    return this.prisma.wing.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createWing(data: { code: string; name: string; headPerson?: string; contactNo?: string }, userId: number) {
    const existing = await this.prisma.wing.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException(`Wing with code ${data.code} already exists`);

    const wing = await this.prisma.wing.create({ data });
    await this.auditService.log({
      userId,
      action: 'CREATE',
      module: 'MASTERS_WING',
      recordId: String(wing.id),
      details: `Created HYDRAA wing: ${wing.name}`,
    });
    return wing;
  }

  async updateWing(id: number, data: { code?: string; name?: string; headPerson?: string; contactNo?: string }, userId: number) {
    const existing = await this.prisma.wing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Wing #${id} not found`);

    if (data.code && data.code !== existing.code) {
      const duplicate = await this.prisma.wing.findUnique({ where: { code: data.code } });
      if (duplicate) throw new BadRequestException(`Wing with code ${data.code} already exists`);
    }

    const updated = await this.prisma.wing.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'MASTERS_WING',
      recordId: String(id),
      details: `Updated wing ${updated.name}`,
    });

    return updated;
  }

  async deleteWing(id: number, userId: number) {
    const existing = await this.prisma.wing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Wing #${id} not found`);

    const billsCount = await this.prisma.bill.count({ where: { wingId: id } });
    if (billsCount > 0) {
      throw new BadRequestException(`Cannot delete Wing ${existing.name} because it has ${billsCount} bills registered under it.`);
    }

    await this.prisma.wing.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      module: 'MASTERS_WING',
      recordId: String(id),
      details: `Deleted wing: ${existing.name}`,
    });

    return { success: true, message: `Wing ${existing.name} deleted successfully` };
  }

  // -------------------------------------------------------------
  // 4. BUDGET HEADS & SUB-HEADS
  // -------------------------------------------------------------
  async getBudgetHeads() {
    return this.prisma.budgetHead.findMany({
      include: { subHeads: true },
      orderBy: { name: 'asc' },
    });
  }

  async createBudgetHead(data: { code: string; name: string; category?: string; description?: string }, userId: number) {
    const existing = await this.prisma.budgetHead.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestException(`Budget head ${data.code} already exists`);

    const head = await this.prisma.budgetHead.create({ data });
    await this.auditService.log({
      userId,
      action: 'CREATE',
      module: 'MASTERS_BUDGET_HEAD',
      recordId: String(head.id),
      details: `Created budget purpose/head: ${head.name}`,
    });
    return head;
  }

  async updateBudgetHead(id: number, data: { code?: string; name?: string; category?: string; description?: string }, userId: number) {
    const existing = await this.prisma.budgetHead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Budget Head #${id} not found`);

    if (data.code && data.code !== existing.code) {
      const duplicate = await this.prisma.budgetHead.findUnique({ where: { code: data.code } });
      if (duplicate) throw new BadRequestException(`Budget Head code ${data.code} already exists`);
    }

    const updated = await this.prisma.budgetHead.update({
      where: { id },
      data,
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'MASTERS_BUDGET_HEAD',
      recordId: String(id),
      details: `Updated budget head: ${updated.name}`,
    });

    return updated;
  }

  async deleteBudgetHead(id: number, userId: number) {
    const existing = await this.prisma.budgetHead.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Budget Head #${id} not found`);

    const [budgetCount, allocCount] = await Promise.all([
      this.prisma.budgetAccount.count({ where: { budgetHeadId: id } }),
      this.prisma.billBudgetAllocation.count({ where: { budgetHeadId: id } }),
    ]);

    if (budgetCount > 0 || allocCount > 0) {
      throw new BadRequestException(`Cannot delete Budget Head ${existing.name} because it is referenced in budgets (${budgetCount}) or bill allocations (${allocCount}).`);
    }

    // Delete associated subheads first then head
    await this.prisma.budgetSubHead.deleteMany({ where: { budgetHeadId: id } });
    await this.prisma.budgetHead.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      module: 'MASTERS_BUDGET_HEAD',
      recordId: String(id),
      details: `Deleted budget head: ${existing.name}`,
    });

    return { success: true, message: `Budget head ${existing.name} deleted successfully` };
  }

  async createSubHead(data: { budgetHeadId: number; code: string; name: string }, userId: number) {
    const sub = await this.prisma.budgetSubHead.create({ data });
    await this.auditService.log({
      userId,
      action: 'CREATE',
      module: 'MASTERS_SUB_HEAD',
      recordId: String(sub.id),
      details: `Created budget sub-head: ${sub.name}`,
    });
    return sub;
  }

  async updateSubHead(id: number, data: { code?: string; name?: string }, userId: number) {
    const updated = await this.prisma.budgetSubHead.update({
      where: { id },
      data,
    });
    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'MASTERS_SUB_HEAD',
      recordId: String(id),
      details: `Updated budget sub-head: ${updated.name}`,
    });
    return updated;
  }

  async deleteSubHead(id: number, userId: number) {
    const sub = await this.prisma.budgetSubHead.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException(`Sub-head #${id} not found`);

    await this.prisma.budgetSubHead.delete({ where: { id } });
    await this.auditService.log({
      userId,
      action: 'DELETE',
      module: 'MASTERS_SUB_HEAD',
      recordId: String(id),
      details: `Deleted budget sub-head: ${sub.name}`,
    });
    return { success: true };
  }
}
