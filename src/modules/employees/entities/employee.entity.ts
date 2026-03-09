import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company, (company) => company.employees)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  documentType: string;

  @Column({ nullable: true })
  documentNumber: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  area: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, type: 'date' })
  hireDate: Date;

  @Column({ default: true })
  active: boolean;
  
  @Column({ default: 0 })
  totalEvaluations: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastEvaluationDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}