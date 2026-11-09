import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export const ALL_PERMISSIONS = [
  { key: 'view_financial_data', label: 'View Financial Records & Balances', category: 'General' },
  { key: 'create_budget', label: 'Create & Post Budget Releases', category: 'Budget' },
  { key: 'create_bill', label: 'Create & Record Bills / Vouchers', category: 'Bills' },
  { key: 'edit_bill', label: 'Edit Unpaid Bills', category: 'Bills' },
  { key: 'delete_bill', label: 'Delete / Cancel Bills', category: 'Bills' },
  { key: 'verify_bill', label: 'Verify & Authorize Bills', category: 'Bills' },
  { key: 'upload_document', label: 'Upload Supporting Documents', category: 'Documents' },
  { key: 'download_document', label: 'Download Sensitive Documents', category: 'Documents' },
  { key: 'manage_vendor', label: 'Create & Edit Vendor Details', category: 'Vendors' },
  { key: 'authorize_payment', label: 'Authorize & Record Treasury Payment / Settlement', category: 'Treasury' },
  { key: 'export_reports', label: 'Export Certified Excel & PDF Reports', category: 'Reports' },
  { key: 'manage_users', label: 'Manage Users, Roles & Permissions', category: 'Security' },
  { key: 'manage_masters', label: 'Configure Wings, Heads & Masters', category: 'Configuration' },
  { key: 'view_audit_logs', label: 'Inspect System Audit Logs', category: 'Audit' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map(p => p.key),
  TREASURY_ADMIN: [
    'view_financial_data', 'create_budget', 'create_bill', 'edit_bill', 'verify_bill',
    'upload_document', 'download_document', 'manage_vendor', 'authorize_payment', 'export_reports',
    'manage_masters', 'view_audit_logs'
  ],
  TREASURY_DATA_ENTRY: [
    'view_financial_data', 'create_budget', 'create_bill', 'upload_document', 'download_document',
    'manage_vendor', 'authorize_payment', 'export_reports'
  ],
  TREASURY_SUPERVISOR: [
    'view_financial_data', 'verify_bill', 'download_document', 'export_reports', 'view_audit_logs'
  ],
  AUDITOR_READ_ONLY: [
    'view_financial_data', 'download_document', 'export_reports', 'view_audit_logs'
  ],
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        designation: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRolePermissions() {
    const customRoles = await this.prisma.rolePermission.findMany();
    const result: Record<string, string[]> = { ...DEFAULT_ROLE_PERMISSIONS };
    customRoles.forEach((cr) => {
      try {
        result[cr.role] = JSON.parse(cr.permissions);
      } catch (e) {}
    });
    return {
      allPermissions: ALL_PERMISSIONS,
      rolePermissions: result,
    };
  }

  async updateRolePermissions(role: UserRole, permissions: string[], adminId: number) {
    const permissionsStr = JSON.stringify(permissions);
    await this.prisma.rolePermission.upsert({
      where: { role },
      update: { permissions: permissionsStr },
      create: { role, permissions: permissionsStr },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE_ROLE_PERMISSIONS',
      module: 'RBAC',
      recordId: role,
      details: `SuperAdmin updated permissions for role ${role}`,
      newValues: permissions,
    });

    return this.getRolePermissions();
  }

  async create(data: {
    username: string;
    email: string;
    fullName: string;
    designation?: string;
    password: string;
    role: UserRole;
    permissions?: string[];
  }, adminId: number) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
      },
    });
    if (existing) {
      throw new BadRequestException('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        designation: data.designation,
        passwordHash,
        role: data.role,
        permissions: data.permissions ? JSON.stringify(data.permissions) : null,
      },
    });

    await this.auditService.log({
      userId: adminId,
      action: 'CREATE',
      module: 'USERS',
      recordId: String(user.id),
      details: `Created new user: ${user.username} with role ${user.role}`,
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: number, data: Partial<{
    fullName: string;
    designation: string;
    role: UserRole;
    isActive: boolean;
    password?: string;
    permissions?: string[];
  }>, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.designation !== undefined) updateData.designation = data.designation;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions ? JSON.stringify(data.permissions) : null;
    }
    if (data.password && data.password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log({
      userId: adminId,
      action: 'UPDATE',
      module: 'USERS',
      recordId: String(id),
      previousValues: { fullName: user.fullName, designation: user.designation, role: user.role, isActive: user.isActive },
      newValues: updateData,
      details: `Updated user profile for ${user.username}`,
    });

    const { passwordHash: _, ...result } = updated;
    return result;
  }

  async delete(id: number, adminId: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.SUPER_ADMIN && user.username === 'superadmin') {
      throw new BadRequestException('Cannot delete the primary root superadmin account');
    }

    await this.prisma.user.delete({ where: { id } });

    await this.auditService.log({
      userId: adminId,
      action: 'DELETE',
      module: 'USERS',
      recordId: String(id),
      details: `Deleted user: ${user.username} (${user.fullName})`,
    });

    return { success: true };
  }
}
