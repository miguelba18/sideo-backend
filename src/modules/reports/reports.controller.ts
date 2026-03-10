import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionAction, PermissionModule } from '../../common/enums';
import { User } from '../users/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, SubscriptionGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Permission(PermissionModule.REPORTS, PermissionAction.READ)
  findAll(@CurrentUser() user: User) {
    return this.reportsService.findAllByCompany(user.companyId);
  }

  @Get(':id')
  @Permission(PermissionModule.REPORTS, PermissionAction.READ)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reportsService.findOne(id, user.companyId);
  }
}