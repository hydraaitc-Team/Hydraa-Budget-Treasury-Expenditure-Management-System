import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MastersModule } from './masters/masters.module';
import { BudgetsModule } from './budgets/budgets.module';
import { VendorsModule } from './vendors/vendors.module';
import { BillsModule } from './bills/bills.module';
import { PaymentsModule } from './payments/payments.module';
import { DocumentsModule } from './documents/documents.module';
import { SearchModule } from './search/search.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    MastersModule,
    BudgetsModule,
    VendorsModule,
    BillsModule,
    PaymentsModule,
    DocumentsModule,
    SearchModule,
    ReportsModule,
  ],
})
export class AppModule {}

