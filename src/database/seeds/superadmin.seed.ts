import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RoleEnum } from 'src/common/enums/role.enum';
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const existing = await userRepo.findOne({
    where: { email: 'superadmin@sideo.app' },
  });

  if (existing) {
    console.log('⚠️ Superadmin ya existe');
    await app.close();
    return;
  }

  const passwordHash = await bcrypt.hash('SuperAdmin2026!', 10);

  const user = userRepo.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@sideo.app',
    passwordHash,
    role: RoleEnum.SUPER_ADMIN,
    active: true,
  });

  await userRepo.save(user);

  console.log('✅ Superadmin creado correctamente');
  await app.close();
}

bootstrap();