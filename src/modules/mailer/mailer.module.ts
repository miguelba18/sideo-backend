import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { SideoMailerService } from './mailer.service';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT'),
          secure: false,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
          family: 4,
  requireTLS: true,
  tls: {
    rejectUnauthorized: false,
  }
        },
        defaults: {
          from: `"SIDEO" <${config.get('MAIL_FROM')}>`,
        },
      }),
    }),
  ],
  providers: [SideoMailerService],
  exports: [SideoMailerService],
})
export class SideoMailerModule {}