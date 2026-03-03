import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../../modules/roles/roles.service';
import { PermissionAction, PermissionModule } from '../enums';

export interface RequiredPermission {
  module: PermissionModule;
  action: PermissionAction;
}

export const PERMISSION_KEY = 'permission';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();

    const allowed = await this.rolesService.hasPermission(user.role, required.module, required.action);

    if (!allowed) throw new ForbiddenException('No tienes permisos para esta acción');

    return true;
  }
}