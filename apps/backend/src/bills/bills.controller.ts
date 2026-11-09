import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { BillsService, CreateBillDto } from './bills.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, BillStatus } from '@prisma/client';

@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  findAll(
    @Query('financialYearId') financialYearId?: string,
    @Query('wingId') wingId?: string,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: BillStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billsService.findAll({
      financialYearId: financialYearId ? Number(financialYearId) : undefined,
      wingId: wingId ? Number(wingId) : undefined,
      vendorId: vendorId ? Number(vendorId) : undefined,
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.billsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_DATA_ENTRY)
  create(@Body() body: CreateBillDto, @Req() req: any) {
    return this.billsService.createBill(body, req.user.id, req.user.fullName || req.user.username);
  }

  @Post(':id/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_SUPERVISOR)
  verify(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.billsService.verifyBill(id, req.user.id, req.user.fullName || req.user.username);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_DATA_ENTRY)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.billsService.updateBill(id, body, req.user.id, req.user.fullName || req.user.username);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.billsService.deleteBill(id, req.user.id, req.user.fullName || req.user.username);
  }

  @Put(':id/tax-references')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_DATA_ENTRY, UserRole.TREASURY_SUPERVISOR)
  updateTaxReferences(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { gstCpin?: string; gstChallanDate?: string; tdsCrn?: string; tdsChallanDate?: string },
    @Req() req: any,
  ) {
    return this.billsService.updateTaxReferences(id, body, req.user.id, req.user.fullName || req.user.username);
  }
}

