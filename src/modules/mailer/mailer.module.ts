import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SideoMailerService } from './mailer.service';

@Module({
  imports: [ConfigModule],
  providers: [SideoMailerService],
  exports: [SideoMailerService],
})
export class SideoMailerModule {}