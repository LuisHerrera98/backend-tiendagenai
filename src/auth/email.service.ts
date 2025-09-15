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
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
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

  // Método original para compatibilidad
  async sendPasswordResetCodeLegacy(email: string, code: string, userName?: string) {
    console.log('📧 Preparando email con código:', { email, code, userName });
    
    const mailOptions = {
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
      to: email,
      subject: 'Código de recuperación de contraseña - Tu Tienda Online',
      text: `Tu código de recuperación es: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">Recuperación de Contraseña</h1>
          
          <p>Hola ${userName || 'Usuario'},</p>
          
          <p>Has solicitado restablecer tu contraseña. Usa el siguiente código para continuar:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; display: inline-block;">
              <h2 style="color: #1f2937; margin: 0; font-size: 32px; letter-spacing: 5px;">${code}</h2>
            </div>
          </div>
          
          <p style="color: #666;">Este código expirará en 15 minutos por seguridad.</p>
          
          <p>Si no solicitaste este cambio, ignora este mensaje.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            © 2024 TiendaGenAI. Todos los derechos reservados.
          </p>
        </div>
      `,
    };

    try {
      console.log('📨 Enviando email con nodemailer...');
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Error sending password reset code:', error);
      return false;
    }
  }

  // Método eliminado - solo usamos sendPasswordResetCode con código de 6 dígitos

  async sendVerificationCode(email: string, code: string, subdomain: string) {
    const mailOptions = {
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
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
    const storeUrl = `https://${subdomain}.tiendagenai.com`;
    const adminUrl = `https://tiendagenai.com/admin`;

    const mailOptions = {
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
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

  async sendUserInviteEmail(
    email: string, 
    userName: string, 
    storeName: string, 
    subdomain: string, 
    setupToken: string
  ) {
    const setupUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}/auth/setup-password?email=${email}&token=${setupToken}`;

    const mailOptions = {
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
      to: email,
      subject: `Invitación para unirte a ${storeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">Bienvenido a ${storeName}</h1>
          
          <p>Hola ${userName},</p>
          
          <p>Has sido invitado a formar parte del equipo de <strong>${storeName}</strong>.</p>
          
          <p>Tu usuario de acceso es: <strong>${email}</strong></p>
          
          <p>Para configurar tu contraseña y acceder a tu cuenta, utiliza el siguiente código de configuración:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 2px;">
              ${setupToken}
            </p>
          </div>
          
          <p>O haz clic en el siguiente enlace:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Configurar mi contraseña
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Este código es válido por 7 días. Si no has solicitado este acceso, ignora este mensaje.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            Accederás a la tienda en: ${subdomain}.com
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Email de invitación enviado a:', email);
    } catch (error) {
      console.error('Error enviando email de invitación:', error);
      throw error;
    }
  }

  async sendFirstLoginEmail(
    email: string,
    userName: string,
    storeName: string,
    setupToken: string
  ) {
    const mailOptions = {
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
      to: email,
      subject: `Configura tu contraseña - ${storeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">Primer acceso a ${storeName}</h1>
          
          <p>Hola ${userName},</p>
          
          <p>Has intentado acceder a tu cuenta pero aún no has configurado tu contraseña.</p>
          
          <p>Utiliza el siguiente código para configurar tu contraseña:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 2px;">
              ${setupToken}
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Este código es válido por 24 horas.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Email de primer login enviado a:', email);
    } catch (error) {
      console.error('Error enviando email de primer login:', error);
      throw error;
    }
  }

  async sendPasswordResetCode(
    email: string,
    userName: string,
    storeName: string,
    code: string
  ) {
    const mailOptions = {
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
      to: email,
      subject: `Código de recuperación - ${storeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">Recuperación de contraseña</h1>
          
          <p>Hola ${userName},</p>
          
          <p>Has solicitado restablecer tu contraseña para acceder a <strong>${storeName}</strong>.</p>
          
          <p>Tu código de recuperación es:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 2px;">
              ${code}
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Este código es válido por 15 minutos. Si no has solicitado este cambio, ignora este mensaje.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Código de recuperación enviado a:', email);
    } catch (error) {
      console.error('Error enviando código de recuperación:', error);
      throw error;
    }
  }

  async sendPasswordResetByAdminEmail(
    email: string,
    userName: string,
    storeName: string,
    subdomain: string,
    setupToken: string
  ) {
    const setupUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3001'}/auth/setup-password?email=${email}&token=${setupToken}`;

    const mailOptions = {
      from: '"TiendaGenAI" <genai.for.business.sa@gmail.com>',
      to: email,
      subject: `Restablecimiento de contraseña - ${storeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a; text-align: center;">Restablecimiento de contraseña</h1>
          
          <p>Hola ${userName},</p>
          
          <p>Un administrador de <strong>${storeName}</strong> ha solicitado que restablezcas tu contraseña.</p>
          
          <p>Utiliza el siguiente código para configurar tu nueva contraseña:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0; letter-spacing: 2px;">
              ${setupToken}
            </p>
          </div>
          
          <p>O haz clic en el siguiente enlace:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" 
               style="background-color: #16a34a; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Restablecer mi contraseña
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Este código es válido por 7 días.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            Accederás a la tienda en: ${subdomain}.com
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Email de restablecimiento enviado a:', email);
    } catch (error) {
      console.error('Error enviando email de restablecimiento:', error);
      throw error;
    }
  }
}