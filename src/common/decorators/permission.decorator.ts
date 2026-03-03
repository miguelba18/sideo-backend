import { SetMetadata } from '@nestjs/common';
import { PermissionAction, PermissionModule } from '../enums';
import { PERMISSION_KEY, RequiredPermission } from '../guards/permissions.guard';

export const Permission = (module: PermissionModule, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { module, action } as RequiredPermission);