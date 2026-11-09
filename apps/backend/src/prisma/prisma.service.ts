import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✓ Successfully connected to MySQL database (hydraa_finance)');
    } catch (err: any) {
      this.logger.warn('⚠️ MySQL database server is not reachable at startup.');
      this.logger.warn('👉 Please ensure the MySQL service is running (e.g. start MySQL80 from Windows Services).');
      this.logger.warn('Prisma will automatically retry connecting when incoming requests arrive.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

