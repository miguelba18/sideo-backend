import {
  Body, Controller, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateEvaluatorDto } from './dto/create-evaluator.dto';
import { UpdateUserDto } from './dto/update-evaluator.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { PermissionAction, PermissionModule } from '../../common/enums';
import { User } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN, RoleEnum.EVALUATOR)
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('evaluators')
  @Permission(PermissionModule.USERS, PermissionAction.CREATE)
  createEvaluator(@CurrentUser() user: User, @Body() dto: CreateEvaluatorDto) {
    return this.usersService.createEvaluator(user.companyId, dto);
  }

  @Get()
  @Permission(PermissionModule.USERS, PermissionAction.READ)
  findAll(@CurrentUser() user: User) {
    return this.usersService.findAllByCompany(user.companyId);
  }

  @Get(':id')
  @Permission(PermissionModule.USERS, PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.findOneByCompany(id, user.companyId);
  }

  @Patch(':id')
  @Permission(PermissionModule.USERS, PermissionAction.UPDATE)
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, user.companyId, dto);
  }

  @Patch(':id/desactivate')
  @Permission(PermissionModule.USERS, PermissionAction.UPDATE)
  deactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.deactivate(id, user.companyId);
  }

  @Patch(':id/reactivate')
  @Permission(PermissionModule.USERS, PermissionAction.UPDATE)
  reactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.reactivate(id, user.companyId);
  }

  @Patch(':id/reset-password')
  @Permission(PermissionModule.USERS, PermissionAction.UPDATE)
  resetPassword(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.resetPassword(id, user.companyId);
  }
}