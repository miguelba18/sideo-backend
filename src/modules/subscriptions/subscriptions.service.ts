import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { PlanEnum, PLAN_LIMITS } from 'src/common/enums/plan.enum';
import { SubscriptionStatus } from 'src/common/enums/subscription-status.enum';



@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async createSubscription(companyId: string, plan: PlanEnum, paymentMethod: string): Promise<Subscription> {
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
      where: { companyId, status: SubscriptionStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async isSubscriptionValid(companyId: string): Promise<boolean> {
    const subscription = await this.getActiveSubscription(companyId);
    if (!subscription) return false;

    const now = new Date();
    const endDate = new Date(subscription.endDate);

    if (now > endDate) {
      await this.subscriptionRepo.update(subscription.id, {
        status: SubscriptionStatus.EXPIRED,
      });
      return false;
    }

    return true;
  }

  async renewSubscription(companyId: string, plan: PlanEnum, paymentMethod: string): Promise<Subscription> {
    const current = await this.getActiveSubscription(companyId);
    if (current) {
      await this.subscriptionRepo.update(current.id, {
        status: SubscriptionStatus.CANCELLED,
      });
    }
    return this.createSubscription(companyId, plan, paymentMethod);
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
}