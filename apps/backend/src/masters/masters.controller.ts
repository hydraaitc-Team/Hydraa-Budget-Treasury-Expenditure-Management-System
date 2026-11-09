import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { MastersService } from './masters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('masters')
@UseGuards(JwtAuthGuard)
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  // -------------------------------------------------------------
  // 1. FINANCIAL YEARS
  // -------------------------------------------------------------
  @Get('financial-years')
  getFinancialYears() {
    return this.mastersService.getFinancialYears();
  }

  @Post('financial-years')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  createFinancialYear(@Body() body: any, @Req() req: any) {
    return this.mastersService.createFinancialYear(body, req.user.id);
  }

  @Put('financial-years/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  updateFinancialYear(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.mastersService.updateFinancialYear(id, body, req.user.id);
  }

  @Delete('financial-years/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  deleteFinancialYear(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.mastersService.deleteFinancialYear(id, req.user.id);
  }

  @Put('financial-years/:id/set-current')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  setCurrentFinancialYear(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.mastersService.setCurrentFinancialYear(id, req.user.id);
  }

  // -------------------------------------------------------------
  // 2. FUNDING SOURCES
  // -------------------------------------------------------------
  @Get('funding-sources')
  getFundingSources() {
    return this.mastersService.getFundingSources();
  }

  @Post('funding-sources')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  createFundingSource(@Body() body: any, @Req() req: any) {
    return this.mastersService.createFundingSource(body, req.user.id);
  }

  @Put('funding-sources/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  updateFundingSource(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.mastersService.updateFundingSource(id, body, req.user.id);
  }

  @Delete('funding-sources/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  deleteFundingSource(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.mastersService.deleteFundingSource(id, req.user.id);
  }

  // -------------------------------------------------------------
  // 3. WINGS
  // -------------------------------------------------------------
  @Get('wings')
  getWings() {
    return this.mastersService.getWings();
  }

  @Post('wings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  createWing(@Body() body: any, @Req() req: any) {
    return this.mastersService.createWing(body, req.user.id);
  }

  @Put('wings/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  updateWing(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.mastersService.updateWing(id, body, req.user.id);
  }

  @Delete('wings/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  deleteWing(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.mastersService.deleteWing(id, req.user.id);
  }

  // -------------------------------------------------------------
  // 4. BUDGET HEADS & SUB-HEADS
  // -------------------------------------------------------------
  @Get('budget-heads')
  getBudgetHeads() {
    return this.mastersService.getBudgetHeads();
  }

  @Post('budget-heads')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  createBudgetHead(@Body() body: any, @Req() req: any) {
    return this.mastersService.createBudgetHead(body, req.user.id);
  }

  @Put('budget-heads/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  updateBudgetHead(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.mastersService.updateBudgetHead(id, body, req.user.id);
  }

  @Delete('budget-heads/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  deleteBudgetHead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.mastersService.deleteBudgetHead(id, req.user.id);
  }

  @Post('budget-sub-heads')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  createSubHead(@Body() body: any, @Req() req: any) {
    return this.mastersService.createSubHead(body, req.user.id);
  }

  @Put('budget-sub-heads/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  updateSubHead(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.mastersService.updateSubHead(id, body, req.user.id);
  }

  @Delete('budget-sub-heads/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  deleteSubHead(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.mastersService.deleteSubHead(id, req.user.id);
  }
}
