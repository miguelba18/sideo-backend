import {
  Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(data: Partial<Company>): Promise<Company> {
    const exists = await this.companyRepo.findOne({ where: { nit: data.nit } });
    if (exists) throw new ConflictException('Ya existe una empresa con ese NIT');
    const company = this.companyRepo.create(data);
    return this.companyRepo.save(company);
  }

  async findById(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  async update(id: string, data: Partial<Company>): Promise<Company> {
    await this.companyRepo.update(id, data);
    return this.findById(id);
  }

  async findAllWithStats() {
    const companies = await this.companyRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.subscriptions', 'sub', 'sub.status IN (:...statuses)', {
        statuses: ['active', 'cancelled'],
      })
      .leftJoin('c.users', 'u', 'u.role = :role AND u.active = true', { role: 'admin' })
      .addSelect(['u.firstName', 'u.lastName', 'u.email', 'u.lastLogin'])
      .leftJoin('c.employees', 'emp')
      .addSelect(['emp.id', 'emp.active'])
      .orderBy('c.createdAt', 'DESC')
      .getMany();

    return companies.map((c) => this.formatCompanyStats(c));
  }

  async findOneWithStats(companyId: string) {
    const company = await this.companyRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.subscriptions', 'sub')
      .leftJoin('c.users', 'u', 'u.role = :role', { role: 'admin' })
      .addSelect(['u.firstName', 'u.lastName', 'u.email', 'u.phone', 'u.lastLogin', 'u.createdAt'])
      .leftJoin('c.employees', 'emp')
      .addSelect(['emp.id', 'emp.active', 'emp.area'])
      .where('c.id = :companyId', { companyId })
      .getOne();

    if (!company) throw new NotFoundException('Empresa no encontrada');

    const activeSubscription = company.subscriptions
      ?.filter((s) => s.status === 'active' || s.status === 'cancelled')
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const totalEmployees = company.employees?.length ?? 0;
    const activeEmployees = company.employees?.filter((e) => e.active).length ?? 0;

    const areaBreakdown = company.employees?.reduce((acc, emp) => {
      if (!emp.active) return acc;
      acc[emp.area ?? 'Sin área'] = (acc[emp.area ?? 'Sin área'] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const allSubscriptions = company.subscriptions
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const admin = (company.users as any[])?.[0];

    return {
      id: company.id,
      name: company.name,
      nit: company.nit,
      sector: company.sector,
      city: company.city,
      address: company.address,
      phone: company.phone,
      contactEmail: company.contactEmail,
      logoUrl: company.logoUrl,
      active: company.active,
      createdAt: company.createdAt,
      admin: admin ? {
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        lastLogin: admin.lastLogin,
        memberSince: admin.createdAt,
      } : null,
      subscription: activeSubscription ? {
        plan: activeSubscription.plan,
        status: activeSubscription.status,
        maxEmployees: activeSubscription.maxEmployees,
        monthlyPrice: activeSubscription.monthlyPrice,
        startDate: activeSubscription.startDate,
        endDate: activeSubscription.endDate,
        daysRemaining: this.getDaysRemaining(activeSubscription.endDate),
        paymentMethod: activeSubscription.paymentMethod,
      } : null,
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: totalEmployees - activeEmployees,
        maxAllowed: activeSubscription?.maxEmployees ?? 0,
        remaining: Math.max(0, (activeSubscription?.maxEmployees ?? 0) - activeEmployees),
        limitReached: activeEmployees >= (activeSubscription?.maxEmployees ?? 0),
        byArea: Object.entries(areaBreakdown ?? {}).map(([area, count]) => ({ area, count })),
      },
      subscriptionHistory: allSubscriptions?.map((s, i) => ({
        month: i + 1,
        plan: s.plan,
        status: s.status,
        monthlyPrice: s.monthlyPrice,
        startDate: s.startDate,
        endDate: s.endDate,
        createdAt: s.createdAt,
      })),
    };
  }

  async getSuperAdminDashboard() {
    const totalCompanies = await this.companyRepo.count({ where: { active: true } });

    const allRows = await this.companyRepo
      .createQueryBuilder('c')
      .leftJoin('c.subscriptions', 'sub')
      .leftJoin('c.employees', 'emp', 'emp.active = true')
      .select('c.id', 'id')
      .addSelect('c.name', 'name')
      .addSelect('c.createdAt', 'createdAt')
      .addSelect('sub.plan', 'plan')
      .addSelect('sub.status', 'status')
      .addSelect('sub.endDate', 'endDate')
      .addSelect('sub.monthlyPrice', 'monthlyPrice')
      .addSelect('sub.createdAt', 'subCreatedAt')
      .addSelect('COUNT(DISTINCT emp.id)', 'employeeCount')
      .where('c.active = true')
      .groupBy('c.id, c.name, c.createdAt, sub.plan, sub.status, sub.endDate, sub.monthlyPrice, sub.createdAt')
      .orderBy('c.createdAt', 'DESC')
      .getRawMany();

    // Keep only the latest subscription row per company
    const latestByCompany = new Map<string, any>();
    for (const row of allRows) {
      const existing = latestByCompany.get(row.id);
      if (!existing || new Date(row.subCreatedAt) > new Date(existing.subCreatedAt)) {
        latestByCompany.set(row.id, row);
      }
    }
    const companiesRaw = Array.from(latestByCompany.values());

    const byPlan = companiesRaw.reduce((acc, c) => {
      const plan = c.plan ?? 'sin_plan';
      acc[plan] = (acc[plan] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = companiesRaw.reduce((acc, c) => {
      const status = c.status ?? 'sin_suscripcion';
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRevenue = companiesRaw.reduce((acc, c) => {
      if (c.status === 'active' || c.status === 'cancelled') {
        return acc + Number(c.monthlyPrice ?? 0);
      }
      return acc;
    }, 0);

    const expiringIn7Days = companiesRaw.filter((c) => {
      const days = this.getDaysRemaining(c.endDate);
      return days >= 0 && days <= 7 && c.status === 'active';
    });

    const expiredCompanies = companiesRaw.filter((c) => {
      const days = this.getDaysRemaining(c.endDate);
      return days < 0 || c.status === 'expired';
    });

    const totalEmployees = companiesRaw.reduce((acc, c) => acc + Number(c.employeeCount ?? 0), 0);

    const recentCompanies = companiesRaw.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name,
      plan: c.plan ?? 'sin_plan',
      status: c.status ?? 'sin_suscripcion',
      employeeCount: Number(c.employeeCount),
      daysRemaining: this.getDaysRemaining(c.endDate),
      createdAt: c.createdAt,
    }));

    return {
      overview: {
        totalCompanies,
        totalEmployees,
        monthlyRevenue: totalRevenue,
        activeSubscriptions: byStatus['active'] ?? 0,
        cancelledSubscriptions: byStatus['cancelled'] ?? 0,
        expiredSubscriptions: expiredCompanies.length,
      },
      byPlan: Object.entries(byPlan).map(([plan, count]) => ({ plan, count })),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      alerts: {
        expiringIn7Days: expiringIn7Days.length,
        expiringCompanies: expiringIn7Days.map((c) => ({
          id: c.id,
          name: c.name,
          plan: c.plan,
          daysRemaining: this.getDaysRemaining(c.endDate),
          endDate: c.endDate,
        })),
        expired: expiredCompanies.length,
        expiredList: expiredCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          plan: c.plan,
          endDate: c.endDate,
        })),
      },
      recentCompanies,
    };
  }

  async toggleActive(companyId: string) {
    const company = await this.findById(companyId);
    await this.companyRepo.update(companyId, { active: !company.active });
    return {
      message: `Empresa ${company.active ? 'desactivada' : 'activada'} exitosamente`,
      active: !company.active,
    };
  }

  private formatCompanyStats(company: Company) {
    const activeSubscription = (company.subscriptions as any[])
      ?.filter((s) => s.status === 'active' || s.status === 'cancelled')
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const totalEmployees = (company.employees as any[])?.length ?? 0;
    const activeEmployees = (company.employees as any[])?.filter((e) => e.active).length ?? 0;
    const admin = (company.users as any[])?.[0];

    return {
      id: company.id,
      name: company.name,
      nit: company.nit,
      sector: company.sector,
      city: company.city,
      contactEmail: company.contactEmail,
      logoUrl: company.logoUrl,
      active: company.active,
      createdAt: company.createdAt,
      admin: admin ? {
        name: `${admin.firstName} ${admin.lastName}`,
        email: admin.email,
        lastLogin: admin.lastLogin,
      } : null,
      subscription: activeSubscription ? {
        plan: activeSubscription.plan,
        status: activeSubscription.status,
        maxEmployees: activeSubscription.maxEmployees,
        monthlyPrice: activeSubscription.monthlyPrice,
        endDate: activeSubscription.endDate,
        daysRemaining: this.getDaysRemaining(activeSubscription.endDate),
      } : null,
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        maxAllowed: activeSubscription?.maxEmployees ?? 0,
        remaining: Math.max(0, (activeSubscription?.maxEmployees ?? 0) - activeEmployees),
        limitReached: activeEmployees >= (activeSubscription?.maxEmployees ?? 0),
      },
    };
  }

  private getDaysRemaining(endDate: Date): number {
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }
}