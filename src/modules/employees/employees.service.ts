import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(companyId: string, dto: CreateEmployeeDto) {
    await this.validateEmployeeLimit(companyId);

    const employee = this.employeeRepo.create({ ...dto, companyId });
    await this.employeeRepo.save(employee);

    return { message: 'Empleado creado exitosamente', employee };
  }

  

  async findAllByCompanyAdmin(companyId: string) {
  const subscription = await this.subscriptionsService.getActiveSubscription(companyId);
  const maxEmployees = subscription?.maxEmployees ?? 0;

  const employees = await this.employeeRepo.find({
    where: { companyId },
    select: [
      'id', 'firstName', 'lastName', 'documentType', 'documentNumber',
      'position', 'area', 'email', 'phone', 'hireDate', 'active',
      'totalEvaluations', 'lastEvaluationDate', 'createdAt',
    ],
    order: { area: 'ASC', firstName: 'ASC' },
  });

  const total = employees.length;
  const activeCount = employees.filter((e) => e.active).length;
  const withEvaluations = employees.filter((e) => e.totalEvaluations > 0).length;
  const neverEvaluated = employees.filter((e) => e.totalEvaluations === 0).length;

  return {
    total,
    activeCount,
    inactive: total - activeCount,
    maxEmployees,
    remaining: maxEmployees - activeCount,
    limitReached: activeCount >= maxEmployees,
    withEvaluations,
    neverEvaluated,
    employees,
  };
}

  async findOneByCompany(employeeId: string, companyId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, companyId },
    });

    if (!employee) throw new NotFoundException('Empleado no encontrado');
    return employee;
  }

  async findAllByCompanyForEvaluator(companyId: string) {
    const employees = await this.employeeRepo.find({
      where: { companyId, active: true },
      select: ['id', 'firstName', 'lastName', 'position', 'area', 'email'],
      order: { area: 'ASC', firstName: 'ASC' },
    });

    return {
      total: employees.length,
      employees,
    };
  }

  async update(employeeId: string, companyId: string, dto: UpdateEmployeeDto) {
    await this.findOneByCompany(employeeId, companyId);
    await this.employeeRepo.update(employeeId, dto);
    return { message: 'Empleado actualizado exitosamente' };
  }

  async deactivate(employeeId: string, companyId: string) {
    await this.findOneByCompany(employeeId, companyId);
    await this.employeeRepo.update(employeeId, { active: false });
    return { message: 'Empleado desactivado exitosamente' };
  }

  async reactivate(employeeId: string, companyId: string) {
    await this.findOneByCompany(employeeId, companyId);

    await this.validateEmployeeLimit(companyId);

    await this.employeeRepo.update(employeeId, { active: true });
    return { message: 'Empleado reactivado exitosamente' };
  }

  async delete(employeeId: string, companyId: string) {
    await this.findOneByCompany(employeeId, companyId);
    await this.employeeRepo.delete(employeeId);
    return { message: 'Empleado eliminado exitosamente' };
  }

  async getStatsByCompany(companyId: string) {
    const total = await this.employeeRepo.count({ where: { companyId } });
    const active = await this.employeeRepo.count({ where: { companyId, active: true } });
    const inactive = total - active;

    const byArea = await this.employeeRepo
      .createQueryBuilder('e')
      .select('e.area', 'area')
      .addSelect('COUNT(*)', 'count')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.active = true')
      .groupBy('e.area')
      .orderBy('count', 'DESC')
      .getRawMany();

    const maxEmployees = await this.subscriptionsService.getEmployeeLimit(companyId);

    return {
      total,
      active,
      inactive,
      maxEmployees,
      remaining: maxEmployees - active,
      limitReached: active >= maxEmployees,
      byArea,
    };
  }

  async incrementEvaluationCount(employeeId: string) {
  const employee = await this.employeeRepo.findOne({ where: { id: employeeId } });
  if (!employee) return;

  await this.employeeRepo.update(employeeId, {
    totalEvaluations: employee.totalEvaluations + 1,
    lastEvaluationDate: new Date(),
  });
}

  private async validateEmployeeLimit(companyId: string) {
    const activeCount = await this.employeeRepo.count({
      where: { companyId, active: true },
    });

    const maxEmployees = await this.subscriptionsService.getEmployeeLimit(companyId);

    if (activeCount >= maxEmployees) {
      throw new ForbiddenException(
        `Has alcanzado el límite de ${maxEmployees} empleados de tu plan. Actualiza tu plan para agregar más.`,
      );
    }
  }
}