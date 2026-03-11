import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from 'src/modules/roles/entities/role.entity';
import { Permission } from 'src/modules/roles/entities/permission.entity';
import { RolePermission } from 'src/modules/roles/entities/role-permission.entity';
import { RoleEnum, PermissionAction, PermissionModule } from '../../common/enums';

config();

/*const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [Role, Permission, RolePermission],
  synchronize: false,
});*/
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [Role, Permission, RolePermission],
  synchronize: false,
});

const ROLE_PERMISSIONS: Record<RoleEnum, Array<{ module: PermissionModule; action: PermissionAction }>> = {
  [RoleEnum.SUPER_ADMIN]: [
    { module: PermissionModule.COMPANIES, action: PermissionAction.MANAGE },
    { module: PermissionModule.USERS, action: PermissionAction.MANAGE },
    { module: PermissionModule.SUBSCRIPTIONS, action: PermissionAction.MANAGE },
    { module: PermissionModule.EMPLOYEES, action: PermissionAction.MANAGE },
    { module: PermissionModule.EVALUATIONS, action: PermissionAction.MANAGE },
    { module: PermissionModule.REPORTS, action: PermissionAction.MANAGE },
    { module: PermissionModule.DASHBOARD, action: PermissionAction.READ },
  ],
  [RoleEnum.ADMIN]: [
    { module: PermissionModule.USERS, action: PermissionAction.CREATE },
    { module: PermissionModule.USERS, action: PermissionAction.READ },
    { module: PermissionModule.USERS, action: PermissionAction.UPDATE },
    { module: PermissionModule.EMPLOYEES, action: PermissionAction.CREATE },
    { module: PermissionModule.EMPLOYEES, action: PermissionAction.READ },
    { module: PermissionModule.EMPLOYEES, action: PermissionAction.UPDATE },
    { module: PermissionModule.EMPLOYEES, action: PermissionAction.DELETE },
    { module: PermissionModule.EVALUATIONS, action: PermissionAction.READ },
    { module: PermissionModule.REPORTS, action: PermissionAction.READ },
    { module: PermissionModule.DASHBOARD, action: PermissionAction.READ },
    { module: PermissionModule.SUBSCRIPTIONS, action: PermissionAction.READ },
  ],
  [RoleEnum.EVALUATOR]: [
    { module: PermissionModule.EMPLOYEES, action: PermissionAction.READ },
    { module: PermissionModule.EVALUATIONS, action: PermissionAction.CREATE },
    { module: PermissionModule.EVALUATIONS, action: PermissionAction.READ },
    { module: PermissionModule.EVALUATIONS, action: PermissionAction.UPDATE },
    { module: PermissionModule.REPORTS, action: PermissionAction.CREATE },
    { module: PermissionModule.REPORTS, action: PermissionAction.READ },
    { module: PermissionModule.DASHBOARD, action: PermissionAction.READ },
  ],
};

async function seed() {
  await dataSource.initialize();

  const roleRepo = dataSource.getRepository(Role);
  const permissionRepo = dataSource.getRepository(Permission);
  const rolePermissionRepo = dataSource.getRepository(RolePermission);

  for (const roleName of Object.values(RoleEnum)) {
    let role = await roleRepo.findOne({ where: { name: roleName } });

    if (!role) {
      role = await roleRepo.save(roleRepo.create({ name: roleName, isSystem: true }));
      console.log(`Rol creado: ${roleName}`);
    }

    const perms = ROLE_PERMISSIONS[roleName];

    for (const { module, action } of perms) {
      let permission = await permissionRepo.findOne({ where: { module, action } });

      if (!permission) {
        permission = await permissionRepo.save(permissionRepo.create({ module, action }));
      }

      const exists = await rolePermissionRepo.findOne({
        where: { roleId: role.id, permissionId: permission.id },
      });

      if (!exists) {
        await rolePermissionRepo.save(
          rolePermissionRepo.create({ roleId: role.id, permissionId: permission.id }),
        );
      }
    }

    console.log(`Permisos asignados a: ${roleName}`);
  }

  console.log('Seed completado');
  await dataSource.destroy();
}

seed().catch(console.error);