import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { PlanEnum, PLAN_LIMITS, SubscriptionStatus } from '../../common/enums';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async createSubscription(
    companyId: string,
    plan: PlanEnum,
    paymentMethod: string,
  ): Promise<Subscription> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const subscription = this.subscriptionRepo.create({
      companyId,
      plan,
      maxEmployees: PLAN_LIMITS[plan],
      monthlyPrice: this.getPlanPrice(plan),
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
      paymentMethod,
    });

    return this.subscriptionRepo.save(subscription);
  }

  async getActiveSubscription(companyId: string): Promise<Subscription | null> {
  return this.subscriptionRepo.findOne({
    where: [
      { companyId, status: SubscriptionStatus.ACTIVE },
      { companyId, status: SubscriptionStatus.CANCELLED },
    ],
    order: { createdAt: 'DESC' },
  });
}

async isSubscriptionValid(companyId: string): Promise<boolean> {
  const subscription = await this.subscriptionRepo.findOne({
    where: [
      { companyId, status: SubscriptionStatus.ACTIVE },
      { companyId, status: SubscriptionStatus.CANCELLED },
    ],
    order: { createdAt: 'DESC' },
  });

  if (!subscription) return false;

  const now = new Date();
  const endDate = new Date(subscription.endDate);

  if (now > endDate) {
    if (subscription.status !== SubscriptionStatus.EXPIRED) {
      await this.subscriptionRepo.update(subscription.id, {
        status: SubscriptionStatus.EXPIRED,
      });
    }
    return false;
  }

  return true;
}

  async renewSubscription(
    companyId: string,
    plan: PlanEnum,
    paymentMethod: string,
  ): Promise<Subscription> {
    const current = await this.getActiveSubscription(companyId);

    if (current) {
      await this.subscriptionRepo.update(current.id, {
        status: SubscriptionStatus.CANCELLED,
      });
    }

    return this.createSubscription(companyId, plan, paymentMethod);
  }

  async upgradeSubscription(
    companyId: string,
    newPlan: PlanEnum,
    paymentMethod: string,
  ): Promise<Subscription> {
    const current = await this.getActiveSubscription(companyId);

    if (!current) {
      throw new NotFoundException('No tienes una suscripción activa');
    }

    const planOrder: Record<PlanEnum, number> = {
      [PlanEnum.PLUS]: 1,
      [PlanEnum.PRO]: 2,
      [PlanEnum.MAX]: 3,
    };

    if (planOrder[newPlan] <= planOrder[current.plan]) {
      throw new BadRequestException(
        `No puedes cambiar a un plan igual o inferior. Plan actual: ${current.plan}`,
      );
    }

    await this.subscriptionRepo.update(current.id, {
      status: SubscriptionStatus.CANCELLED,
    });

    return this.createSubscription(companyId, newPlan, paymentMethod);
  }

  async cancelSubscription(companyId: string): Promise<{ message: string; activeUntil: Date }> {
    const current = await this.getActiveSubscription(companyId);

    if (!current) {
      throw new NotFoundException('No tienes una suscripción activa');
    }

    await this.subscriptionRepo.update(current.id, {
      status: SubscriptionStatus.CANCELLED,
    });

    return {
      message: 'Suscripción cancelada. Tendrás acceso hasta la fecha de vencimiento.',
      activeUntil: current.endDate,
    };
  }

  async getSubscriptionInfo(companyId: string) {
  const subscription = await this.subscriptionRepo.findOne({
    where: [
      { companyId, status: SubscriptionStatus.ACTIVE },
      { companyId, status: SubscriptionStatus.CANCELLED },
    ],
    order: { createdAt: 'DESC' },
  });

  if (!subscription) {
    return { hasSubscription: false };
  }

  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isCancelled = subscription.status === SubscriptionStatus.CANCELLED;

  return {
    hasSubscription: true,
    plan: subscription.plan,
    status: subscription.status,
    maxEmployees: subscription.maxEmployees,
    monthlyPrice: subscription.monthlyPrice,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
    paymentMethod: subscription.paymentMethod,
    ...(isCancelled && {
      warning: `Tu suscripción fue cancelada pero puedes seguir usando la plataforma por ${daysRemaining} día(s) más. Renueva tu plan para no perder el acceso.`,
    }),
  };
}

  async getEmployeeLimit(companyId: string): Promise<number> {
    const subscription = await this.getActiveSubscription(companyId);
    return subscription?.maxEmployees ?? 0;
  }

  private getPlanPrice(plan: PlanEnum): number {
    const prices: Record<PlanEnum, number> = {
      [PlanEnum.PLUS]: 49,
      [PlanEnum.PRO]: 99,
      [PlanEnum.MAX]: 249,
    };
    return prices[plan];
  }

  async getSubscriptionHistory(companyId: string) {
  const records = await this.subscriptionRepo.find({
    where: { companyId },
    order: { createdAt: 'ASC' },
  });

  const totalMonths = records.length;

  const history = records.map((sub, index) => ({
    month: index + 1,
    plan: sub.plan,
    status: sub.status,
    maxEmployees: sub.maxEmployees,
    monthlyPrice: Number(sub.monthlyPrice),
    paymentMethod: sub.paymentMethod,
    startDate: sub.startDate,
    endDate: sub.endDate,
    createdAt: sub.createdAt,
  }));

  const totalSpent = records.reduce(
    (acc, sub) => acc + Number(sub.monthlyPrice),
    0,
  );

  return {
    companyId,
    totalMonths,
    totalSpent,
    history,
  };
}
}