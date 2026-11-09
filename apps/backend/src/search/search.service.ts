import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, filters?: {
    type?: string;
    tokenNumber?: string;
    chequeNumber?: string;
    utrNumber?: string;
    billNo?: string;
    invoiceNo?: string;
    vendorName?: string;
  }) {
    const q = (query || '').trim();
    const tokenQ = filters?.tokenNumber?.trim() || (q ? q : undefined);
    const chequeQ = filters?.chequeNumber?.trim() || (q ? q : undefined);
    const utrQ = filters?.utrNumber?.trim() || (q ? q : undefined);
    const billQ = filters?.billNo?.trim() || (q ? q : undefined);
    const invQ = filters?.invoiceNo?.trim() || (q ? q : undefined);
    const vendorQ = filters?.vendorName?.trim() || (q ? q : undefined);

    // If nothing provided, return empty
    if (!q && !filters?.tokenNumber && !filters?.chequeNumber && !filters?.utrNumber && !filters?.billNo && !filters?.invoiceNo && !filters?.vendorName) {
      return { results: [] };
    }

    // 1. Search Settlements (Token, Cheque, UTR, Settlement Ref)
    const settlementWhere: any = { OR: [] };
    if (tokenQ) settlementWhere.OR.push({ tokenNumber: { contains: tokenQ } });
    if (chequeQ) settlementWhere.OR.push({ chequeNumber: { contains: chequeQ } });
    if (utrQ) settlementWhere.OR.push({ utrNumber: { contains: utrQ } });
    if (q) settlementWhere.OR.push({ settlementReference: { contains: q } });
    if (vendorQ) settlementWhere.OR.push({ bill: { vendor: { name: { contains: vendorQ } } } });

    // 2. Search Bills (Bill No, Invoice No, Vendor Name, CPIN, CRIN)
    const billWhere: any = { OR: [] };
    if (billQ) billWhere.OR.push({ internalBillNo: { contains: billQ } });
    if (invQ) billWhere.OR.push({ invoiceNo: { contains: invQ } });
    if (vendorQ) billWhere.OR.push({ vendor: { name: { contains: vendorQ } } });
    if (q) {
      billWhere.OR.push({ internalBillNo: { contains: q } });
      billWhere.OR.push({ invoiceNo: { contains: q } });
      billWhere.OR.push({ billSubject: { contains: q } });
      billWhere.OR.push({ gstCpin: { contains: q } });
      billWhere.OR.push({ tdsCrn: { contains: q } });
      billWhere.OR.push({ vendor: { name: { contains: q } } });
    }

    // 3. Search Vendors (Name, Code, GSTIN, PAN)
    const vendorWhere: any = { OR: [] };
    if (vendorQ) vendorWhere.OR.push({ name: { contains: vendorQ } });
    if (q) {
      vendorWhere.OR.push({ name: { contains: q } });
      vendorWhere.OR.push({ vendorCode: { contains: q } });
      vendorWhere.OR.push({ gstin: { contains: q } });
      vendorWhere.OR.push({ pan: { contains: q } });
    }

    // 4. Search Orders
    const orderWhere: any = { OR: [] };
    if (q) orderWhere.OR.push({ orderNumber: { contains: q } });

    const [bills, settlements, vendors, orders] = await Promise.all([
      billWhere.OR.length > 0
        ? this.prisma.bill.findMany({
            where: billWhere,
            include: { vendor: true, wing: true, financialYear: true },
            take: 15,
          })
        : [],
      settlementWhere.OR.length > 0
        ? this.prisma.billSettlement.findMany({
            where: settlementWhere,
            include: {
              bill: { include: { vendor: true, wing: true } },
            },
            take: 15,
          })
        : [],
      vendorWhere.OR.length > 0
        ? this.prisma.vendor.findMany({
            where: vendorWhere,
            take: 15,
          })
        : [],
      orderWhere.OR.length > 0
        ? this.prisma.governmentOrder.findMany({
            where: orderWhere,
            include: { financialYear: true, fundingSource: true },
            take: 15,
          })
        : [],
    ]);

    const results = [
      ...settlements.map((s) => ({
        type: 'SETTLEMENT',
        id: s.id,
        title: `Settlement ${s.settlementReference} (Bill: ${s.bill?.internalBillNo || 'N/A'})`,
        subtitle: `UTR: ${s.utrNumber || 'N/A'} | Token: ${s.tokenNumber || 'N/A'} | Cheque: ${s.chequeNumber || 'N/A'} | Vendor: ${s.bill?.vendor?.name}`,
        settlementReference: s.settlementReference,
        tokenNumber: s.tokenNumber,
        chequeNumber: s.chequeNumber,
        utrNumber: s.utrNumber,
        amount: Number(s.grossSettledAmount),
        status: 'PAID',
        date: s.paymentDate,
        matchedFields: [
          s.tokenNumber && (tokenQ ? `Token: ${s.tokenNumber}` : null),
          s.chequeNumber && (chequeQ ? `Cheque: ${s.chequeNumber}` : null),
          s.utrNumber && (utrQ ? `UTR: ${s.utrNumber}` : null),
        ].filter(Boolean),
      })),
      ...bills.map((b) => ({
        type: 'BILL',
        id: b.id,
        title: `${b.internalBillNo} - ${b.billSubject}`,
        subtitle: `Vendor: ${b.vendor.name} | Inv: ${b.invoiceNo} | FY: ${b.financialYear.code}`,
        amount: Number(b.grossAmount),
        status: b.status,
        date: b.createdAt,
        matchedFields: [
          `Bill No: ${b.internalBillNo}`,
          `Invoice: ${b.invoiceNo}`,
          `Vendor: ${b.vendor.name}`,
        ],
      })),
      ...vendors.map((v) => ({
        type: 'VENDOR',
        id: v.id,
        title: `${v.name} (${v.vendorCode})`,
        subtitle: `GSTIN: ${v.gstin || 'N/A'} | PAN: ${v.pan || 'N/A'}`,
        amount: null,
        status: v.isActive ? 'ACTIVE' : 'INACTIVE',
        date: v.createdAt,
        matchedFields: [`Vendor: ${v.name}`],
      })),
      ...orders.map((o) => ({
        type: 'GO_BRO',
        id: o.id,
        title: `${o.orderType}: ${o.orderNumber}`,
        subtitle: `Source: ${o.fundingSource.code} | FY: ${o.financialYear.code}`,
        amount: Number(o.amount),
        status: 'SANCTIONED',
        date: o.orderDate,
        matchedFields: [`Order No: ${o.orderNumber}`],
      })),
    ];

    return { query: q, total: results.length, results };
  }
}
