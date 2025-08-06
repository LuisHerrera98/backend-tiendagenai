import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Usando Gmail como servicio gratuito
    // Para producción, cambiar a SendGrid o similar
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_USER') || 'your-email@gmail.com',
        pass: this.configService.get('EMAIL_PASS') || 'your-app-password',
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, subdomain: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: '"Tu Tienda Online" <noreply@tutienda.com>',
      to: email,
      subject: 'Verifica tu cuenta - Tu Tienda Online',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">¡Bienvenido a Tu Tienda Online!</h1>
          
          <p>Hola,</p>
          
          <p>Gracias por registrarte. Tu tienda estará disponible en:</p>
          <p style="font-size: 18px; font-weight: bold; color: #2563eb;">
            ${subdomain}.${this.configService.get('DOMAIN') || 'tutienda.com'}
          </p>
          
          <p>Para activar tu cuenta, por favor haz clic en el siguiente enlace:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verificar mi cuenta
            </a>
          </div>
          
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <p>Este enlace expirará en 24 horas.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 12px;">
            Si no creaste esta cuenta, puedes ignorar este email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: '"Tu Tienda Online" <noreply@tutienda.com>',
      to: email,
      subject: 'Restablecer contraseña - Tu Tienda Online',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">Restablecer contraseña</h1>
          
          <p>Hola,</p>
          
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          
          <p>Este enlace expirará en 1 hora.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 12px;">
            Si no solicitaste restablecer tu contraseña, puedes ignorar este email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string, subdomain: string) {
    const mailOptions = {
      from: '"TiendaGenAI" <noreply@tiendagenai.com>',
      to: email,
      subject: 'Código de verificación - TiendaGenAI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">Verifica tu email</h1>
          
          <p>Hola,</p>
          
          <p>Estás a un paso de crear tu tienda en TiendaGenAI:</p>
          <p style="font-size: 18px; font-weight: bold; color: #2563eb;">
            ${subdomain}.tiendagenai.com
          </p>
          
          <p>Ingresa este código de verificación para completar el registro:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 10px; padding: 20px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 8px;">
                ${code}
              </span>
            </div>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            Este código expira en 10 minutos
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 12px;">
            Si no solicitaste crear una tienda, puedes ignorar este email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending verification code:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, storeName: string, subdomain: string) {
    const storeUrl = `https://${subdomain}.${this.configService.get('DOMAIN') || 'tutienda.com'}`;
    const adminUrl = `https://${subdomain}.${this.configService.get('DOMAIN') || 'tutienda.com'}/admin`;

    const mailOptions = {
      from: '"Tu Tienda Online" <noreply@tutienda.com>',
      to: email,
      subject: `¡${storeName} está lista! - Tu Tienda Online`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">¡Tu tienda está lista!</h1>
          
          <p>¡Felicidades! ${storeName} ya está activa y lista para recibir clientes.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Tus enlaces importantes:</h3>
            <p><strong>Tu tienda:</strong> <a href="${storeUrl}">${storeUrl}</a></p>
            <p><strong>Panel de administración:</strong> <a href="${adminUrl}">${adminUrl}</a></p>
          </div>
          
          <h3>Próximos pasos:</h3>
          <ol>
            <li>Agrega tus primeros productos</li>
            <li>Personaliza los colores y logo de tu tienda</li>
            <li>Configura tus métodos de pago</li>
            <li>¡Comparte tu tienda con tus clientes!</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Ir a mi panel de administración
            </a>
          </div>
          
          <p>¿Necesitas ayuda? Responde a este email y con gusto te asistiremos.</p>
          
          <p>¡Éxitos con tu nueva tienda!</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
}