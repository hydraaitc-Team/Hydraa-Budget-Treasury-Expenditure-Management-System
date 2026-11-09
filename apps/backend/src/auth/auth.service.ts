import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(username: string, pass: string, ipAddress?: string, userAgent?: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: username }, { email: username }],
      },
    });

    if (!user) {
      await this.prisma.loginHistory.create({
        data: {
          username,
          status: 'FAILED',
          ipAddress,
          userAgent,
          reason: 'User not found',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          username: user.username,
          status: 'DEACTIVATED',
          ipAddress,
          userAgent,
          reason: 'Account deactivated',
        },
      });
      throw new UnauthorizedException('Account has been deactivated. Please contact SuperAdmin.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(`Account locked until ${user.lockedUntil.toLocaleTimeString()} due to excessive failed attempts.`);
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      const failed = user.failedLogins + 1;
      let lockedUntil: Date | null = null;
      if (failed >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed,
          lockedUntil,
        },
      });

      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          username: user.username,
          status: 'FAILED',
          ipAddress,
          userAgent,
          reason: `Invalid password (Attempt ${failed})`,
        },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed logins on successful authentication
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        username: user.username,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      module: 'AUTH',
      recordId: String(user.id),
      details: `User ${user.username} logged in successfully`,
      ipAddress,
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any, ipAddress?: string) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        designation: user.designation,
        role: user.role,
      },
    };
  }
}

