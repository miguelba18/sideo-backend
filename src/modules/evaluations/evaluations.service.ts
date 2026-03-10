import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationDetail } from './entities/evaluacion-detail.entity';
import { EmployeesService } from '../employees/employees.service';
import { RosaCalculator } from './rosa/rosa-calculator';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class EvaluationsService {
  private readonly calculator = new RosaCalculator();

  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
    @InjectRepository(EvaluationDetail)
    private readonly detailRepo: Repository<EvaluationDetail>,
    private readonly employeesService: EmployeesService,
    private readonly reportsService: ReportsService,
  ) {}

  async create(
    evaluatorId: string,
    companyId: string,
    dto: CreateEvaluationDto,
  ) {
    const employee = await this.employeesService.findOneByCompany(
      dto.employeeId,
      companyId,
    );

    if (!employee.active) {
      throw new ForbiddenException('No se pueden evaluar empleados inactivos.');
    }

    const scores = this.calculator.calculate({
      chair: dto.chair,
      screen: dto.screen,
      peripherals: dto.peripherals,
    });

    const evaluation = this.evaluationRepo.create({
      employeeId: dto.employeeId,
      evaluatorId,
      companyId,
      chairScore: scores.chairTotal,
      screenPeripheralScore: scores.tableD,
      rosaFinal: scores.rosaFinal,
      riskLevel: scores.riskLevel,
      actionLevel: scores.actionLevel,
      actionRequired: scores.actionRequired,
      recommendations: scores.recommendations,
      observations: dto.observations,
    });

    const saved = await this.evaluationRepo.save(evaluation);

    await this.detailRepo.save(
      this.detailRepo.create({
        evaluationId: saved.id,
        ...scores,
        rawInput: {
          chair: dto.chair,
          screen: dto.screen,
          peripherals: dto.peripherals,
        },
      }),
    );

    await this.employeesService.incrementEvaluationCount(dto.employeeId);
    const report = await this.reportsService.generateFromEvaluation(
      saved.id,
      companyId,
      evaluatorId,
    );

    return {
      id: saved.id,
      rosaFinal: scores.rosaFinal,
      riskLevel: scores.riskLevel,
      actionLevel: scores.actionLevel,
      actionRequired: scores.actionRequired,
      chairScore: scores.chairTotal,
      screenPeripheralScore: scores.tableD,
      breakdown: {
        seatHeight: scores.seatHeight,
        seatDepth: scores.seatDepth,
        armrests: scores.armrests,
        backrest: scores.backrest,
        chairTableA: scores.chairTableA,
        chairTotal: scores.chairTotal,
        screenWithTime: scores.screenWithTime,
        phoneWithTime: scores.phoneWithTime,
        tableB: scores.tableB,
        mouseWithTime: scores.mouseWithTime,
        keyboardWithTime: scores.keyboardWithTime,
        tableC: scores.tableC,
        tableD: scores.tableD,
      },
      recommendations: scores.recommendations,
      employee: `${employee.firstName} ${employee.lastName}`,
      area: employee.area,
      report: {
        file: report,
      },
    };
  }

  async findAllByCompany(companyId: string) {
    const evaluations = await this.evaluationRepo.find({
      where: { companyId },
      relations: ['employee', 'evaluator'],
      order: { createdAt: 'DESC' },
    });

    return evaluations.map((e) => ({
      id: e.id,
      employee: `${e.employee.firstName} ${e.employee.lastName}`,
      area: e.employee.area,
      evaluator: `${e.evaluator.firstName} ${e.evaluator.lastName}`,
      rosaFinal: e.rosaFinal,
      riskLevel: e.riskLevel,
      actionLevel: e.actionLevel,
      createdAt: e.createdAt,
    }));
  }

  async findAllByEmployee(employeeId: string, companyId: string) {
    const employee = await this.employeesService.findOneByCompany(
      employeeId,
      companyId,
    );

    const evaluations = await this.evaluationRepo.find({
      where: { employeeId },
      relations: ['evaluator'],
      order: { createdAt: 'DESC' },
    });

    return {
      employee: `${employee.firstName} ${employee.lastName}`,
      area: employee.area,
      totalEvaluations: evaluations.length,
      evaluations: evaluations.map((e) => ({
        id: e.id,
        rosaFinal: e.rosaFinal,
        riskLevel: e.riskLevel,
        actionLevel: e.actionLevel,
        evaluator: `${e.evaluator.firstName} ${e.evaluator.lastName}`,
        createdAt: e.createdAt,
      })),
    };
  }

  async findOne(evaluationId: string, companyId: string) {
    const evaluation = await this.evaluationRepo.findOne({
      where: { id: evaluationId, companyId },
      relations: ['employee', 'evaluator'],
    });

    if (!evaluation) throw new NotFoundException('Evaluación no encontrada');

    const detail = await this.detailRepo.findOne({
      where: { evaluationId },
    });

    return { ...evaluation, detail };
  }

  async getDashboardStats(companyId: string) {
    const total = await this.evaluationRepo.count({ where: { companyId } });

    const byRisk = await this.evaluationRepo
      .createQueryBuilder('e')
      .select('e.riskLevel', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .where('e.companyId = :companyId', { companyId })
      .groupBy('e.riskLevel')
      .getRawMany();

    const avgScore = await this.evaluationRepo
      .createQueryBuilder('e')
      .select('AVG(e.rosaFinal)', 'avg')
      .where('e.companyId = :companyId', { companyId })
      .getRawOne();

    const criticalAreas = await this.evaluationRepo
      .createQueryBuilder('e')
      .innerJoin('e.employee', 'emp')
      .select('emp.area', 'area')
      .addSelect('AVG(e.rosaFinal)', 'avgScore')
      .addSelect('COUNT(*)', 'total')
      .where('e.companyId = :companyId', { companyId })
      .andWhere('e.actionLevel >= 2')
      .groupBy('emp.area')
      .orderBy('avgScore', 'DESC')
      .getRawMany();

    const recent = await this.evaluationRepo.find({
      where: { companyId },
      relations: ['employee'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      total,
      averageScore: parseFloat(avgScore?.avg ?? '0').toFixed(1),
      criticalAreas: criticalAreas.length,
      byRisk,
      criticalAreasList: criticalAreas,
      recentEvaluations: recent.map((e) => ({
        id: e.id,
        employee: `${e.employee.firstName} ${e.employee.lastName}`,
        area: e.employee.area,
        rosaFinal: e.rosaFinal,
        riskLevel: e.riskLevel,
        createdAt: e.createdAt,
      })),
    };
  }
}
