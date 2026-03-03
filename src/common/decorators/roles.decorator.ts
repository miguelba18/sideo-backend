import { SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../enums/role.enum';

export const Roles = (...roles: RoleEnum[]) => SetMetadata('roles', roles);