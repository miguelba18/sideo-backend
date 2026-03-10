import {
  Controller, Get, Param, Patch, UseGuards,
} from '@nestjs/common';
import { CompaniesService } from './company.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('dashboard')
  getSuperAdminDashboard() {
    return this.companiesService.getSuperAdminDashboard();
  }

  @Get()
  findAll() {
    return this.companiesService.findAllWithStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOneWithStats(id);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.companiesService.toggleActive(id);
  }
}