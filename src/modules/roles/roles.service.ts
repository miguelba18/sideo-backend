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
  async getPermissionsByRoleFormatted(role: RoleEnum): Promise<Record<string, string[]>> {
  const rolePermissions = await this.rolePermissionRepo
    .createQueryBuilder('rp')
    .innerJoin('rp.role', 'r')
    .innerJoinAndSelect('rp.permission', 'p')
    .where('r.name = :role', { role })
    .getMany();

  const result: Record<string, string[]> = {};

  for (const rp of rolePermissions) {
    const { module, action } = rp.permission;
    if (!result[module]) result[module] = [];
    result[module].push(action);
  }

  return result;
}

  async getAllRolesWithPermissions() {
  const roles = Object.values(RoleEnum);
  const result: Record<string, Record<string, string[]>> = {};

  for (const role of roles) {
    result[role] = await this.getPermissionsByRoleFormatted(role);
  }

  return result;
}
}