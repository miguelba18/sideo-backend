import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail = require('@sendgrid/mail');

@Injectable()
export class SideoMailerService {
  private readonly logger = new Logger(SideoMailerService.name);

  constructor(private readonly config: ConfigService) {
    sgMail.setApiKey(this.config.get<string>('SENDGRID_API_KEY')!);
  }

  async sendWelcomeCredentials(email: string, name: string, tempPassword: string): Promise<void> {
    try {
      await sgMail.send({
        to: email,
        from: { email: this.config.get<string>('MAIL_FROM')!, name: 'SIDEO' },
        subject: 'Bienvenido a SIDEO — Tus credenciales de acceso',
        html: this.buildWelcomeTemplate(name, email, tempPassword),
      });
      this.logger.log(`Correo enviado a ${email}`);
    } catch (error) {
      this.logger.warn(`Email no enviado a ${email}: ${error.message}`);
      throw error;
    }
  }

  async sendPasswordChanged(email: string, name: string): Promise<void> {
    try {
      await sgMail.send({
        to: email,
        from: { email: this.config.get<string>('MAIL_FROM')!, name: 'SIDEO' },
        subject: 'SIDEO — Contraseña actualizada',
        html: `<p>Hola ${name}, tu contraseña fue actualizada exitosamente.</p>`,
      });
    } catch (error) {
      this.logger.warn(`Email no enviado a ${email}: ${error.message}`);
    }
  }

  private buildWelcomeTemplate(name: string, email: string, tempPassword: string): string {
    return `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1E3A8A; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">SIDEO</h1>
          <p style="color: #93C5FD; margin: 4px 0 0;">Sistema de Diagnóstico Ergonómico Ocupacional</p>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #E5E7EB; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">¡Bienvenido, ${name}!</h2>
          <p style="color: #6B7280;">Tu cuenta ha sido creada. Usa estas credenciales para ingresar:</p>
          <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #111827;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0 0; color: #111827;"><strong>Contraseña temporal:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #EF4444; font-size: 14px;">Al ingresar deberás cambiar tu contraseña y completar tu perfil.</p>
          <a href="${this.config.get('FRONTEND_URL')}/login"
             style="display: inline-block; background: #1E3A8A; color: #fff; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; margin-top: 16px;">
            Ingresar a SIDEO
          </a>
        </div>
      </div>
    `;
  }
}