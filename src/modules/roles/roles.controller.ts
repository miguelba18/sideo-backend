import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('my-permissions')
  getMyPermissions(@CurrentUser() user: User) {
    return this.rolesService.getPermissionsByRoleFormatted(user.role);
  }

  @Get(':role/permissions')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
  getPermissionsByRole(@Param('role') role: RoleEnum) {
    return this.rolesService.getPermissionsByRoleFormatted(role);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.SUPER_ADMIN)
  getAllRolesWithPermissions() {
    return this.rolesService.getAllRolesWithPermissions();
  }
}