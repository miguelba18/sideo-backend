import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { RoleEnum } from '../../common/enums/role.enum';
import { SideoMailerService } from '../mailer/mailer.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateEvaluatorDto } from './dto/create-evaluator.dto';
import { UpdateUserDto } from './dto/update-evaluator.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailerService: SideoMailerService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async createEvaluator(companyId: string, dto: CreateEvaluatorDto): Promise<{ message: string }> {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese correo');

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const tempExpiry = new Date();
    tempExpiry.setHours(tempExpiry.getHours() + 48);

    const evaluator = this.userRepo.create({
      companyId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      position: dto.position,
      passwordHash,
      role: RoleEnum.EVALUATOR,
      profileCompleted: false,
      tempPasswordExpiry: tempExpiry,
    });

    await this.userRepo.save(evaluator);
    await this.mailerService.sendWelcomeCredentials(dto.email, dto.firstName, tempPassword);

    return { message: `Evaluador creado. Se enviaron las credenciales a ${dto.email}` };
  }

  async findAllByCompany(companyId: string) {
    const users = await this.userRepo.find({
      where: { companyId },
      select: ['id', 'firstName', 'lastName', 'email', 'phone', 'position', 'role', 'active', 'profileCompleted', 'lastLogin', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    return {
      total: users.length,
      users,
    };
  }

  async findOneByCompany(userId: string, companyId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId, companyId },
      select: ['id', 'firstName', 'lastName', 'email', 'phone', 'position', 'role', 'active', 'profileCompleted', 'lastLogin', 'createdAt'],
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.userRepo.update(userId, dto);
    return { message: 'Perfil actualizado exitosamente' };
  }

  async update(userId: string, companyId: string, dto: UpdateUserDto) {
    const user = await this.findOneByCompany(userId, companyId);

    if (user.role === RoleEnum.ADMIN) {
      throw new ForbiddenException('No puedes modificar otro administrador');
    }

    await this.userRepo.update(userId, dto);
    return { message: 'Usuario actualizado exitosamente' };
  }

  async deactivate(userId: string, companyId: string) {
    const user = await this.findOneByCompany(userId, companyId);

    if (user.role === RoleEnum.ADMIN) {
      throw new ForbiddenException('No puedes desactivar al administrador');
    }

    await this.userRepo.update(userId, { active: false });
    return { message: 'Usuario desactivado exitosamente' };
  }

  async reactivate(userId: string, companyId: string) {
    await this.findOneByCompany(userId, companyId);
    await this.userRepo.update(userId, { active: true });
    return { message: 'Usuario reactivado exitosamente' };
  }

  async resetPassword(userId: string, companyId: string) {
    const user = await this.findOneByCompany(userId, companyId);

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const tempExpiry = new Date();
    tempExpiry.setHours(tempExpiry.getHours() + 24);

    await this.userRepo.update(userId, {
      passwordHash,
      profileCompleted: false,
      tempPasswordExpiry: tempExpiry,
    });

    await this.mailerService.sendWelcomeCredentials(user.email, user.firstName, tempPassword);
    return { message: 'Contraseña reiniciada. Se enviaron nuevas credenciales al correo.' };
  }

  private generateTempPassword(): string {
    return uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  }
}