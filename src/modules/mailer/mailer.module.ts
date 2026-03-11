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
          requireTLS: true,
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASS'),
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000, 
          family: 4,
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