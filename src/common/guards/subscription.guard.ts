import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';
import { RoleEnum } from '../enums/role.enum';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    if (user.role === RoleEnum.SUPER_ADMIN) return true;

    const isValid = await this.subscriptionsService.isSubscriptionValid(user.companyId);

    if (!isValid) {
      throw new ForbiddenException('Tu suscripción ha expirado. Por favor renueva tu plan.');
    }

    return true;
  }
}