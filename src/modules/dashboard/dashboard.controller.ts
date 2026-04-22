import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
@Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN, RoleEnum.EVALUATOR)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getAdminDashboard(@CurrentUser() user: User) {
    return this.dashboardService.getAdminDashboard(user.companyId);
  }
}
