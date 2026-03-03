import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, OneToMany,
} from 'typeorm';
import { RolePermission } from './role-permission.entity';
import { PermissionAction, PermissionModule } from 'src/common/enums';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PermissionModule })
  module: PermissionModule;

  @Column({ type: 'enum', enum: PermissionAction })
  action: PermissionAction;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions: RolePermission[];
}