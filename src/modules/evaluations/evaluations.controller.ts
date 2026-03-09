import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { PermissionAction, PermissionModule } from '../../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionsGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.EVALUATOR, RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EVALUATIONS, PermissionAction.CREATE)
  create(@CurrentUser() user: User, @Body() dto: CreateEvaluationDto) {
    return this.evaluationsService.create(user.id, user.companyId, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.EVALUATIONS, PermissionAction.READ)
  findAll(@CurrentUser() user: User) {
    return this.evaluationsService.findAllByCompany(user.companyId);
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
  @Permission(PermissionModule.DASHBOARD, PermissionAction.READ)
  getDashboard(@CurrentUser() user: User) {
    return this.evaluationsService.getDashboardStats(user.companyId);
  }

  @Get('employee/:employeeId')
  @Permission(PermissionModule.EVALUATIONS, PermissionAction.READ)
  findByEmployee(@Param('employeeId') employeeId: string, @CurrentUser() user: User) {
    return this.evaluationsService.findAllByEmployee(employeeId, user.companyId);
  }

  @Get(':id')
  @Permission(PermissionModule.EVALUATIONS, PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.evaluationsService.findOne(id, user.companyId);
  }
}