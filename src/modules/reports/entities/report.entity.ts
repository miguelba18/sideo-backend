import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Evaluation } from 'src/modules/evaluations/entities/evaluation.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  evaluationId: string;

  @Column()
  generatedById: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Evaluation)
  @JoinColumn({ name: 'evaluationId' })
  evaluation: Evaluation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'generatedById' })
  generatedBy: User;

  @Column()
  fileName: string;

  @Column()
  publicUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}