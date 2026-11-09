import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { vendorCode: { contains: search } },
        { gstin: { contains: search } },
        { pan: { contains: search } },
      ];
    }
    return this.prisma.vendor.findMany({
      where,
      include: {
        bankAccounts: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        bankAccounts: true,
        bills: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async create(data: {
    name: string;
    pan?: string;
    gstin?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    purpose?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  }, userId: number) {
    // Generate Vendor Code: HYDRAA-VND-XXXX
    const count = await this.prisma.vendor.count();
    const vendorCode = `HYDRAA-VND-${String(count + 1).padStart(4, '0')}`;

    const vendor = await this.prisma.$transaction(async (tx) => {
      const v = await tx.vendor.create({
        data: {
          vendorCode,
          name: data.name,
          pan: data.pan?.toUpperCase() || null,
          gstin: data.gstin?.toUpperCase() || null,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          purpose: data.purpose || null,
        },
      });

      if (data.bankName && data.accountNumber && data.ifscCode) {
        await tx.vendorBankAccount.create({
          data: {
            vendorId: v.id,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            ifscCode: data.ifscCode.toUpperCase(),
            branch: data.branch || null,
            isPrimary: true,
          },
        });
      }

      return v;
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      module: 'VENDORS',
      recordId: String(vendor.id),
      details: `Created Vendor ${vendor.name} (${vendorCode})`,
    });

    return this.findOne(vendor.id);
  }

  async addBankAccount(vendorId: number, data: { bankName: string; accountNumber: string; ifscCode: string; branch?: string }, userId: number) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const bank = await this.prisma.vendorBankAccount.create({
      data: {
        vendorId,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode.toUpperCase(),
        branch: data.branch || null,
        isPrimary: false,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE',
      module: 'VENDOR_BANK',
      recordId: String(bank.id),
      details: `Added new bank account for vendor ${vendor.name}`,
    });

    return bank;
  }

  async update(id: number, data: {
    name?: string;
    pan?: string;
    gstin?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    purpose?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  }, userId: number) {
    const existing = await this.prisma.vendor.findUnique({
      where: { id },
      include: { bankAccounts: true },
    });
    if (!existing) throw new NotFoundException('Vendor not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const v = await tx.vendor.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.pan !== undefined ? { pan: data.pan ? data.pan.toUpperCase() : null } : {}),
          ...(data.gstin !== undefined ? { gstin: data.gstin ? data.gstin.toUpperCase() : null } : {}),
          ...(data.contactPerson !== undefined ? { contactPerson: data.contactPerson || null } : {}),
          ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
          ...(data.email !== undefined ? { email: data.email || null } : {}),
          ...(data.address !== undefined ? { address: data.address || null } : {}),
          ...(data.purpose !== undefined ? { purpose: data.purpose || null } : {}),
        },
      });

      // Update or create primary bank account if provided
      if (data.bankName && data.accountNumber && data.ifscCode) {
        const primaryBank = existing.bankAccounts.find((b) => b.isPrimary) || existing.bankAccounts[0];
        if (primaryBank) {
          await tx.vendorBankAccount.update({
            where: { id: primaryBank.id },
            data: {
              bankName: data.bankName,
              accountNumber: data.accountNumber,
              ifscCode: data.ifscCode.toUpperCase(),
              branch: data.branch || null,
            },
          });
        } else {
          await tx.vendorBankAccount.create({
            data: {
              vendorId: id,
              bankName: data.bankName,
              accountNumber: data.accountNumber,
              ifscCode: data.ifscCode.toUpperCase(),
              branch: data.branch || null,
              isPrimary: true,
            },
          });
        }
      }

      return v;
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE',
      module: 'VENDORS',
      recordId: String(id),
      details: `Updated Vendor profile & bank account: ${updated.name}`,
    });

    return this.findOne(id);
  }

  async delete(id: number, userId: number) {
    const existing = await this.prisma.vendor.findUnique({
      where: { id },
      include: { bills: true },
    });
    if (!existing) throw new NotFoundException('Vendor not found');

    if (existing.bills && existing.bills.length > 0) {
      throw new BadRequestException(`Cannot delete Vendor ${existing.name} because there are ${existing.bills.length} bills/claims recorded under this vendor.`);
    }

    await this.prisma.vendorBankAccount.deleteMany({ where: { vendorId: id } });
    await this.prisma.vendor.delete({ where: { id } });

    await this.auditService.log({
      userId,
      action: 'DELETE',
      module: 'VENDORS',
      recordId: String(id),
      details: `Deleted Vendor: ${existing.name} (${existing.vendorCode})`,
    });

    return { success: true, message: `Vendor ${existing.name} deleted successfully` };
  }
}

