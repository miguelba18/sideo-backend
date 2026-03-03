import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './entities/role-permission.entity';
import { PermissionAction, PermissionModule, RoleEnum } from '../../common/enums';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
  ) {}

  async hasPermission(role: RoleEnum, module: PermissionModule, action: PermissionAction): Promise<boolean> {
    const result = await this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoin('rp.role', 'r')
      .innerJoin('rp.permission', 'p')
      .where('r.name = :role', { role })
      .andWhere('p.module = :module', { module })
      .andWhere('p.action IN (:...actions)', {
        actions: [action, PermissionAction.MANAGE],
      })
      .getCount();

    return result > 0;
  }

  async getPermissionsByRole(role: RoleEnum) {
    return this.rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoin('rp.role', 'r')
      .innerJoinAndSelect('rp.permission', 'p')
      .where('r.name = :role', { role })
      .getMany();
  }
}