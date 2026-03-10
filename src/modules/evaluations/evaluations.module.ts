import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationDetail } from './entities/evaluacion-detail.entity';
import { EvaluationsService } from './evaluations.service';
import { EvaluationsController } from './evaluations.controller';
import { EmployeesModule } from '../employees/employees.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RolesModule } from '../roles/roles.module';
import { ReportsModule } from '../reports/reports.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Evaluation, EvaluationDetail]),
    EmployeesModule,
    SubscriptionsModule,
    RolesModule,
    ReportsModule
    
  ],
  providers: [EvaluationsService],
  controllers: [EvaluationsController],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}