import {
  Body, Controller, Delete, Get,
  Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { PermissionAction, PermissionModule } from '../../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('employees')
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.CREATE)
  create(@CurrentUser() user: User, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.companyId, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.READ)
  findAll(@CurrentUser() user: User) {
    return this.employeesService.findAllByCompanyAdmin(user.companyId);
  }

  @Get('for-evaluation')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.EVALUATOR, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.READ)
  findForEvaluation(@CurrentUser() user: User) {
    return this.employeesService.findAllByCompanyForEvaluator(user.companyId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.READ)
  getStats(@CurrentUser() user: User) {
    return this.employeesService.getStatsByCompany(user.companyId);
  }

  @Get(':id')
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.employeesService.findOneByCompany(id, user.companyId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.UPDATE)
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, user.companyId, dto);
  }

  @Patch(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.UPDATE)
  deactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.employeesService.deactivate(id, user.companyId);
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.UPDATE)
  reactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.employeesService.reactivate(id, user.companyId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EMPLOYEES, PermissionAction.DELETE)
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.employeesService.delete(id, user.companyId);
  }
}