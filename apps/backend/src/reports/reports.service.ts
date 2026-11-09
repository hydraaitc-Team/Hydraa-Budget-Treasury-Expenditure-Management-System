import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
const PDFDocument = require('pdfkit-table');

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Dashboard Metrics API
  async getDashboardMetrics(financialYearId?: number) {
    // If no financialYearId provided, resolve the current active financial year
    let targetFyId = financialYearId;
    if (!targetFyId) {
      const activeFy = await this.prisma.financialYear.findFirst({ where: { isCurrent: true } })
        || await this.prisma.financialYear.findFirst({ orderBy: { startDate: 'desc' } });
      if (activeFy) {
        targetFyId = activeFy.id;
      }
    }

    const whereAccount: any = {};
    const whereBill: any = {};
    if (targetFyId) {
      whereAccount.financialYearId = targetFyId;
      whereBill.financialYearId = targetFyId;
    }

    const [accounts, bills, settlements, fundingSources, wings, budgetHeads, allFinancialYears, selectedFy] = await Promise.all([
      this.prisma.budgetAccount.findMany({
        where: whereAccount,
        include: { fundingSource: true, budgetHead: true },
      }),
      this.prisma.bill.findMany({
        where: whereBill,
        include: { wing: true, vendor: true },
      }),
      this.prisma.billSettlement.findMany({
        where: targetFyId ? { bill: { financialYearId: targetFyId } } : {},
        include: { bill: { include: { wing: true } } },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
      this.prisma.fundingSource.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } }),
      this.prisma.wing.findMany({ where: { isActive: true } }),
      this.prisma.budgetHead.findMany({ where: { isActive: true } }),
      this.prisma.financialYear.findMany({ orderBy: { startDate: 'desc' } }),
      targetFyId ? this.prisma.financialYear.findUnique({ where: { id: targetFyId } }) : null,
    ]);

    // Totals for selected year
    let totalEstimated = 0;
    let totalAllotted = 0;
    let totalReleased = 0;
    let totalAdditional = 0;
    let totalExpenditure = 0;
    let totalUnspent = 0;

    // Source-wise totals for selected year
    const sourceWise: Record<string, { estimated: number; allotted: number; released: number; expenditure: number; unspent: number }> = {};
    fundingSources.forEach((fs) => {
      sourceWise[fs.code] = { estimated: 0, allotted: 0, released: 0, expenditure: 0, unspent: 0 };
    });

    accounts.forEach((acc) => {
      const est = Number(acc.estimatedAmount);
      const allot = Number(acc.allottedAmount);
      const rel = Number(acc.releasedAmount);
      const add = Number(acc.additionalAmount);
      const exp = Number(acc.expenditureAmount);
      const unspent = Number(acc.unspentBalance);

      totalEstimated += est;
      totalAllotted += allot;
      totalReleased += rel;
      totalAdditional += add;
      totalExpenditure += exp;
      totalUnspent += unspent;

      if (sourceWise[acc.fundingSource.code]) {
        sourceWise[acc.fundingSource.code].estimated += est;
        sourceWise[acc.fundingSource.code].allotted += allot;
        sourceWise[acc.fundingSource.code].released += rel;
        sourceWise[acc.fundingSource.code].expenditure += exp;
        sourceWise[acc.fundingSource.code].unspent += unspent;
      }
    });

    const sourceWiseList = fundingSources.map((fs) => {
      const metrics = sourceWise[fs.code] || { estimated: 0, allotted: 0, released: 0, expenditure: 0, unspent: 0 };
      return {
        id: fs.id,
        code: fs.code,
        name: fs.name,
        description: fs.description,
        ...metrics,
      };
    });

    // Multi-year comparative table
    const yearlyComparison = await Promise.all(
      allFinancialYears.map(async (fy) => {
        const fyAccounts = await this.prisma.budgetAccount.findMany({
          where: { financialYearId: fy.id },
        });
        const fyBills = await this.prisma.bill.findMany({
          where: { financialYearId: fy.id },
        });
        const released = fyAccounts.reduce((s, a) => s + Number(a.releasedAmount), 0);
        const expenditure = fyAccounts.reduce((s, a) => s + Number(a.expenditureAmount), 0);
        const unspent = fyAccounts.reduce((s, a) => s + Number(a.unspentBalance), 0);
        return {
          id: fy.id,
          code: fy.code,
          name: fy.name,
          isCurrent: fy.isCurrent,
          released,
          expenditure,
          unspent,
          billsCount: fyBills.length,
          billsAmount: fyBills.reduce((s, b) => s + Number(b.grossAmount), 0),
        };
      })
    );

    // Bill Counts
    const pendingBills = bills.filter((b) => b.status === 'UNPAID');
    const partiallyPaidBills = bills.filter((b) => b.status === 'PARTIALLY_PAID');
    const fullyPaidBills = bills.filter((b) => b.status === 'FULLY_PAID');

    // Purpose-wise expenditure breakdown
    const purposeWise: Record<string, number> = {};
    accounts.forEach((acc) => {
      const exp = Number(acc.expenditureAmount);
      purposeWise[acc.budgetHead.name] = (purposeWise[acc.budgetHead.name] || 0) + exp;
    });

    return {
      selectedFinancialYear: selectedFy ? {
        id: selectedFy.id,
        code: selectedFy.code,
        name: selectedFy.name,
        isCurrent: selectedFy.isCurrent,
      } : null,
      summary: {
        totalEstimated,
        totalAllotted,
        totalReleased,
        totalAdditional,
        totalExpenditure,
        totalUnspent,
        pendingBillsCount: pendingBills.length,
        pendingBillsAmount: pendingBills.reduce((s, b) => s + Number(b.grossAmount), 0),
        partiallyPaidCount: partiallyPaidBills.length,
        fullyPaidCount: fullyPaidBills.length,
        totalBillsCount: bills.length,
      },
      sourceWise,
      sourceWiseList,
      yearlyComparison,
      purposeBreakdown: Object.entries(purposeWise).map(([name, amount]) => ({ name, amount })),
      recentSettlements: settlements.map((s) => ({
        id: s.id,
        settlementRef: s.settlementReference,
        billRef: s.bill.internalBillNo,
        wing: s.bill.wing.name,
        amount: Number(s.grossSettledAmount),
        utr: s.utrNumber,
        token: s.tokenNumber,
        date: s.paymentDate,
      })),
    };
  }

  // 2. Excel Export Generator
  async generateFinancialExcel(financialYearId?: number): Promise<ExcelJS.Buffer> {
    const metrics = await this.getDashboardMetrics(financialYearId);
    const accounts = await this.prisma.budgetAccount.findMany({
      where: financialYearId ? { financialYearId } : {},
      include: { financialYear: true, fundingSource: true, budgetHead: true },
    });

    const bills = await this.prisma.bill.findMany({
      where: financialYearId ? { financialYearId } : {},
      include: { financialYear: true, wing: true, vendor: true },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HYDRAA Treasury System';
    workbook.created = new Date();

    // Sheet 1: Financial Summary
    const sheet1 = workbook.addWorksheet('HYDRAA Financial Statement');
    sheet1.columns = [
      { header: 'Budget Head / Purpose', key: 'head', width: 30 },
      { header: 'Funding Source', key: 'source', width: 15 },
      { header: 'Financial Year', key: 'fy', width: 15 },
      { header: 'Budget Released (₹)', key: 'released', width: 22 },
      { header: 'Actual Expenditure (₹)', key: 'expenditure', width: 22 },
      { header: 'Available Unspent Balance (₹)', key: 'unspent', width: 25 },
    ];

    accounts.forEach((a) => {
      sheet1.addRow({
        head: a.budgetHead.name,
        source: a.fundingSource.code,
        fy: a.financialYear.code,
        released: Number(a.releasedAmount),
        expenditure: Number(a.expenditureAmount),
        unspent: Number(a.unspentBalance),
      });
    });

    // Sheet 2: Bill Register
    const sheet2 = workbook.addWorksheet('Bills & Expenditure Register');
    sheet2.columns = [
      { header: 'Bill Reference', key: 'ref', width: 25 },
      { header: 'Invoice No', key: 'inv', width: 20 },
      { header: 'Vendor Name', key: 'vendor', width: 30 },
      { header: 'Originating Wing', key: 'wing', width: 20 },
      { header: 'Gross Bill (₹)', key: 'gross', width: 18 },
      { header: 'Total Deductions (₹)', key: 'deductions', width: 20 },
      { header: 'Net Payable (₹)', key: 'net', width: 18 },
      { header: 'Paid Amount (₹)', key: 'paid', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    bills.forEach((b) => {
      sheet2.addRow({
        ref: b.internalBillNo,
        inv: b.invoiceNo,
        vendor: b.vendor.name,
        wing: b.wing.name,
        gross: Number(b.grossAmount),
        deductions: Number(b.totalDeductions),
        net: Number(b.netPayableAmount),
        paid: Number(b.paidAmount),
        status: b.status,
      });
    });

    return workbook.xlsx.writeBuffer();
  }

  // 3. Official PDF Report Generator
  async generateFinancialPdf(financialYearId?: number): Promise<Buffer> {
    const metrics = await this.getDashboardMetrics(financialYearId);
    const accounts = await this.prisma.budgetAccount.findMany({
      where: financialYearId ? { financialYearId } : {},
      include: { financialYear: true, fundingSource: true, budgetHead: true },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header
      doc.fontSize(16).text('HYDERABAD DISASTER RESPONSE AND ASSET PROTECTION AGENCY', { align: 'center' });
      doc.fontSize(12).text('GOVERNMENT OF TELANGANA', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).text('HYDRAA BUDGET & EXPENDITURE STATEMENT', { align: 'center', underline: true });
      doc.moveDown(1);

      // Summary Table
      const tableData = {
        title: 'Source-wise Budget & Expenditure Summary (in INR)',
        headers: ['Category / Head', 'Funding Source', 'Released (₹)', 'Expenditure (₹)', 'Available Balance (₹)'],
        rows: accounts.map((a) => [
          a.budgetHead.name,
          a.fundingSource.code,
          Number(a.releasedAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          Number(a.expenditureAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          Number(a.unspentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        ]),
      };

      doc.table(tableData, {
        prepareHeader: () => doc.fontSize(9),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => doc.fontSize(8),
      });

      doc.moveDown(1);
      doc.fontSize(10).text(`Total Released Budget: ₹ ${metrics.summary.totalReleased.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      doc.fontSize(10).text(`Total Actual Expenditure: ₹ ${metrics.summary.totalExpenditure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      doc.fontSize(10).text(`Total Available Unspent Balance: ₹ ${metrics.summary.totalUnspent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

      doc.moveDown(2);
      doc.text('Certified by Treasury Officer, HYDRAA', { align: 'right' });

      doc.end();
    });
  }
}
