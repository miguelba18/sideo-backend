import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, OneToOne, JoinColumn,
} from 'typeorm';
import { Evaluation } from './evaluation.entity';

@Entity('evaluation_details')
export class EvaluationDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  evaluationId: string;

  @OneToOne(() => Evaluation)
  @JoinColumn({ name: 'evaluationId' })
  evaluation: Evaluation;

  @Column({ type: 'int' }) seatHeight: number;
  @Column({ type: 'int' }) seatDepth: number;
  @Column({ type: 'int' }) armrests: number;
  @Column({ type: 'int' }) backrest: number;
  @Column({ type: 'int' }) chairTableA: number;
  @Column({ type: 'int' }) chairUsageTime: number;
  @Column({ type: 'int' }) chairTotal: number;

  @Column({ type: 'int' }) screenRaw: number;
  @Column({ type: 'int' }) screenWithTime: number;
  @Column({ type: 'int' }) phoneRaw: number;
  @Column({ type: 'int' }) phoneWithTime: number;
  @Column({ type: 'int' }) tableB: number;

  @Column({ type: 'int' }) mouseRaw: number;
  @Column({ type: 'int' }) mouseWithTime: number;
  @Column({ type: 'int' }) keyboardRaw: number;
  @Column({ type: 'int' }) keyboardWithTime: number;
  @Column({ type: 'int' }) tableC: number;
  @Column({ type: 'int' }) tableD: number;

  @Column({ type: 'jsonb' }) rawInput: object;

  @CreateDateColumn()
  createdAt: Date;
}