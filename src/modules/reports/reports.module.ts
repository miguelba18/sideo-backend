import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { Evaluation } from '../evaluations/entities/evaluation.entity';
import { EvaluationDetail } from '../evaluations/entities/evaluacion-detail.entity';
import { Company } from '../companies/entities/company.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { RolesModule } from '../roles/roles.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Report, Evaluation, EvaluationDetail, Company]),
    SubscriptionsModule,
    RolesModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}