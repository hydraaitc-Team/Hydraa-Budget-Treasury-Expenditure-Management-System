import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.TREASURY_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('roles/permissions')
  @Roles(UserRole.SUPER_ADMIN)
  getRolePermissions() {
    return this.usersService.getRolePermissions();
  }

  @Put('roles/permissions')
  @Roles(UserRole.SUPER_ADMIN)
  updateRolePermissions(@Body() body: { role: UserRole; permissions: string[] }, @Req() req: any) {
    return this.usersService.updateRolePermissions(body.role, body.permissions, req.user.id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() body: any, @Req() req: any) {
    return this.usersService.create(body, req.user.id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.usersService.update(id, body, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.delete(id, req.user.id);
  }
}
