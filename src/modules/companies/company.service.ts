import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';

@Injectable()
export class CompanyService {
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

  async findById(id: string): Promise<Company | null> {
    return this.companyRepo.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Company>): Promise<Company | null> {
    await this.companyRepo.update(id, data);
    return this.findById(id);
  }
}