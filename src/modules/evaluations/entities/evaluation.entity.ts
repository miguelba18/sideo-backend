import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne,
} from 'typeorm';
import { Employee } from 'src/modules/employees/entities/employee.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  employeeId: string;

  @Column()
  evaluatorId: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'evaluatorId' })
  evaluator: User;

  @Column({ type: 'int' })
  chairScore: number;

  @Column({ type: 'int' })
  screenPeripheralScore: number;

  @Column({ type: 'int' })
  rosaFinal: number;

  @Column()
  riskLevel: string;

  @Column({ type: 'int' })
  actionLevel: number;

  @Column()
  actionRequired: string;

  @Column({ type: 'text', array: true, default: [] })
  recommendations: string[];

  @Column({ nullable: true, type: 'text' })
  observations: string;

  @Column({ default: 'completed' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}