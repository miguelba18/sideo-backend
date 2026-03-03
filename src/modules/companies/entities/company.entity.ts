import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Subscription } from 'src/modules/subscriptions/entities/subscription.entity';
import { Employee } from 'src/modules/employees/entities/employee.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nit: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  sector: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  contactEmail: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Subscription, (sub) => sub.company)
  subscriptions: Subscription[];

  @OneToMany(() => Employee, (emp) => emp.company)
  employees: Employee[];
}