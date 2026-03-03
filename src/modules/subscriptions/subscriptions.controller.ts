import { Body, Controller, Get, Post, Put, UseGuards, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('info')
  @UseGuards(SubscriptionGuard)
  getInfo(@CurrentUser() user: User) {
    return this.subscriptionsService.getSubscriptionInfo(user.companyId);
  }

  @Post('renew')
  renew(@CurrentUser() user: User, @Body() dto: RenewSubscriptionDto) {
    return this.subscriptionsService.renewSubscription(
      user.companyId,
      dto.plan,
      dto.paymentMethod,
    );
  }

  @Put('upgrade')
  upgrade(@CurrentUser() user: User, @Body() dto: UpgradeSubscriptionDto) {
    return this.subscriptionsService.upgradeSubscription(
      user.companyId,
      dto.newPlan,
      dto.paymentMethod,
    );
  }

  @Put('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: User) {
    return this.subscriptionsService.cancelSubscription(user.companyId);
  }

  @Get('history')
@UseGuards(SubscriptionGuard)
getHistory(@CurrentUser() user: User) {
  return this.subscriptionsService.getSubscriptionHistory(user.companyId);
}

@Get('history/:companyId')
@Roles(RoleEnum.SUPER_ADMIN)
getHistoryByCompany(@Param('companyId') companyId: string) {
  return this.subscriptionsService.getSubscriptionHistory(companyId);
}
}