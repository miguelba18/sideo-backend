import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../users/entities/user.entity';
import { CompaniesService } from '../companies/company.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SideoMailerService } from '../mailer/mailer.service';
import { RoleEnum } from '../../common/enums/role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly companiesService: CompaniesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mailerService: SideoMailerService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const company = await this.companiesService.create({
      name: dto.companyName,
      nit: dto.nit,
      sector: dto.sector,
      city: dto.city,
      phone: dto.phone,
      contactEmail: dto.adminEmail,
    });

    await this.subscriptionsService.createSubscription(company.id, dto.plan, dto.paymentMethod);

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 6);
    const tempExpiry = new Date();
    tempExpiry.setHours(tempExpiry.getHours() + 24);
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.adminEmail } });
    if (existingEmail) {
      throw new BadRequestException('El correo del administrador ya está registrado');
    }

    const user = this.userRepo.create({
      companyId: company.id,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      email: dto.adminEmail,
      passwordHash,
      role: RoleEnum.ADMIN,
      profileCompleted: false,
      tempPasswordExpiry: tempExpiry,
    });

    await this.userRepo.save(user);

this.mailerService.sendWelcomeCredentials(
  user.email,
  user.firstName,
  tempPassword
).catch(err => console.error('Email error', err));

return { message: 'Empresa registrada. Revisa tu correo para obtener tus credenciales.' };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, active: true },
      relations: ['company'],
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Credenciales inválidas');

    if (user.role !== RoleEnum.SUPER_ADMIN) {
  const isValid = await this.subscriptionsService.isSubscriptionValid(user.companyId);
  if (!isValid) {
    throw new UnauthorizedException(
      'No tienes una suscripción activa. Renueva tu plan para continuar.',
    );
  }
}
    await this.userRepo.update(user.id, { lastLogin: new Date() });

    const token = this.jwtService.sign({ sub: user.id, role: user.role, companyId: user.companyId });

    return {
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profileCompleted: user.profileCompleted,
        companyId: user.companyId,
      },
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.userRepo.update(userId, {
      firstName: dto.firstName ?? user.firstName,
      lastName: dto.lastName ?? user.lastName,
      phone: dto.phone,
      position: dto.position,
      passwordHash,
      profileCompleted: true,
      tempPasswordExpiry: undefined,
    });

    if (dto.companyAddress || dto.companySector) {
      await this.companiesService.update(user.companyId, {
        address: dto.companyAddress,
        sector: dto.companySector,
        logoUrl: dto.logoUrl,
      });
    }

    return { message: 'Perfil completado exitosamente' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(userId, { passwordHash });
    await this.mailerService.sendPasswordChanged(user.email, user.firstName);

    return { message: 'Contraseña actualizada exitosamente' };
  }

  private generateTempPassword(): string {
    return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  }
}