import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboardMetrics(@Query('financialYearId') financialYearId?: string) {
    return this.reportsService.getDashboardMetrics(financialYearId ? Number(financialYearId) : undefined);
  }

  @Get('export/excel')
  async exportExcel(@Query('financialYearId') financialYearId: string, @Res() res: Response) {
    const buffer = await this.reportsService.generateFinancialExcel(financialYearId ? Number(financialYearId) : undefined);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="HYDRAA_Financial_Statement.xlsx"');
    res.send(buffer);
  }

  @Get('export/pdf')
  async exportPdf(@Query('financialYearId') financialYearId: string, @Res() res: Response) {
    const buffer = await this.reportsService.generateFinancialPdf(financialYearId ? Number(financialYearId) : undefined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="HYDRAA_Financial_Statement.pdf"');
    res.send(buffer);
  }
}

