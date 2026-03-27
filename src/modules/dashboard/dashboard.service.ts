import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { RoleEnum } from '../../common/enums/role.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getAdminDashboard(companyId: string) {
    const [company, subscription, employees, evaluations, team] = await Promise.all([
      this.getCompanyInfo(companyId),
      this.getSubscriptionInfo(companyId),
      this.getEmployeeStats(companyId),
      this.getEvaluationStats(companyId),
      this.getTeamStats(companyId),
    ]);

    return {
      company: { ...company, ...subscription },
      employees,
      evaluations,
      team,
    };
  }

  private async getCompanyInfo(companyId: string) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      select: ['name', 'sector', 'city', 'logoUrl'],
    });
    return company ?? {};
  }

  private async getSubscriptionInfo(companyId: string) {
    const sub = await this.subscriptionRepo
      .createQueryBuilder('s')
      .where('s.companyId = :companyId', { companyId })
      .andWhere('s.status IN (:...statuses)', { statuses: ['active', 'cancelled'] })
      .orderBy('s.createdAt', 'DESC')
      .getOne();

    if (!sub) {
      return { plan: null, planStatus: 'sin_suscripcion', daysRemaining: 0, maxEmployees: 0 };
    }

    return {
      plan: sub.plan,
      planStatus: sub.status,
      daysRemaining: this.getDaysRemaining(sub.endDate),
      maxEmployees: sub.maxEmployees,
      subscriptionEndDate: sub.endDate,
    };
  }

  private async getEmployeeStats(companyId: string) {
    const total = await this.employeeRepo.count({ where: { companyId } });
    const active = await this.employeeRepo.count({ where: { companyId, active: true } });
    const neverEvaluated = await this.employeeRepo.count({
      where: { companyId, active: true, totalEvaluations: 0 },
    });

    const byArea = await this.employeeRepo
      .createQueryBuilder('e')
      .select('e.area', 'area')
      .addSelect('COUNT(*)', 'count')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.active = true')
      .groupBy('e.area')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      total,
      active,
      inactive: total - active,
      neverEvaluated,
      byArea: byArea.map((a) => ({ area: a.area ?? 'Sin área', count: Number(a.count) })),
    };
  }

  private async getEvaluationStats(companyId: string) {
    const total = await this.evaluationRepo.count({ where: { companyId } });

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = await this.evaluationRepo
      .createQueryBuilder('e')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    const avgScore = await this.evaluationRepo
      .createQueryBuilder('e')
      .select('AVG(e.rosaFinal)', 'avg')
      .where('e.companyId = :companyId', { companyId })
      .getRawOne();

    const byRisk = await this.evaluationRepo
      .createQueryBuilder('e')
      .select('e.riskLevel', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .where('e.companyId = :companyId', { companyId })
      .groupBy('e.riskLevel')
      .orderBy('count', 'DESC')
      .getRawMany();

    const criticalAreas = await this.evaluationRepo
      .createQueryBuilder('e')
      .innerJoin('e.employee', 'emp')
      .select('emp.area', 'area')
      .addSelect('AVG(e.rosaFinal)', 'avgScore')
      .addSelect('COUNT(*)', 'total')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.actionLevel >= 2')
      .groupBy('emp.area')
      .orderBy('AVG(e.rosaFinal)', 'DESC')
      .limit(5)
      .getRawMany();

    const recent = await this.evaluationRepo.find({
      where: { companyId },
      relations: ['employee', 'evaluator'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      total,
      thisMonth,
      averageScore: parseFloat(avgScore?.avg ?? '0').toFixed(1),
      byRisk: byRisk.map((r) => ({ riskLevel: r.riskLevel, count: Number(r.count) })),
      criticalAreas: criticalAreas.map((a) => ({
        area: a.area ?? 'Sin área',
        avgScore: parseFloat(a.avgScore).toFixed(1),
        total: Number(a.total),
      })),
      recentEvaluations: recent.map((e) => ({
        id: e.id,
        employee: `${e.employee.firstName} ${e.employee.lastName}`,
        area: e.employee.area,
        evaluator: `${e.evaluator.firstName} ${e.evaluator.lastName}`,
        rosaFinal: e.rosaFinal,
        riskLevel: e.riskLevel,
        actionLevel: e.actionLevel,
        createdAt: e.createdAt,
      })),
    };
  }

  private async getTeamStats(companyId: string) {
    const evaluators = await this.userRepo.find({
      where: { companyId, role: RoleEnum.EVALUATOR },
      select: ['id', 'firstName', 'lastName', 'active', 'lastLogin'],
    });

    return {
      totalEvaluators: evaluators.length,
      activeEvaluators: evaluators.filter((u) => u.active).length,
      evaluators: evaluators.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        active: u.active,
        lastLogin: u.lastLogin,
      })),
    };
  }

  private getDaysRemaining(endDate: Date): number {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
}
