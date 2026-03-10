import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompaniesService } from './company.service';
import { CompaniesController } from './company.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompanyModule {}