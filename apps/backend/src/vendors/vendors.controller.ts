import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.vendorsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vendorsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_DATA_ENTRY)
  create(@Body() body: any, @Req() req: any) {
    return this.vendorsService.create(body, req.user.id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN, UserRole.TREASURY_DATA_ENTRY)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.vendorsService.update(id, body, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.vendorsService.delete(id, req.user.id);
  }

  @Post(':id/bank-accounts')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  addBankAccount(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.vendorsService.addBankAccount(id, body, req.user.id);
  }
}

