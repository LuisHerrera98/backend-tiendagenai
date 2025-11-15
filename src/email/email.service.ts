import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendOrderConfirmationToCustomer(
    email: string,
    orderData: {
      orderNumber: string;
      customerName: string;
      storeName: string;
      total: number;
      items: any[];
    },
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Confirmación de Pedido #${orderData.orderNumber} - ${orderData.storeName}`,
        template: 'order-confirmation',
        context: {
          customerName: orderData.customerName,
          orderNumber: orderData.orderNumber,
          storeName: orderData.storeName,
          total: orderData.total,
          items: orderData.items,
        },
      });
    } catch (error) {
      console.error('Error enviando email al cliente:', error);
    }
  }

  async sendNewOrderNotificationToOwner(
    ownerEmail: string,
    orderData: {
      orderNumber: string;
      customerName: string;
      customerPhone: string;
      customerEmail: string;
      storeName: string;
      total: number;
      items: any[];
      notes?: string;
    },
  ) {
    try {
      await this.mailerService.sendMail({
        to: ownerEmail,
        subject: `🔔 Nuevo Pedido #${orderData.orderNumber} - ${orderData.storeName}`,
        template: 'new-order-notification',
        context: {
          orderNumber: orderData.orderNumber,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerEmail: orderData.customerEmail,
          storeName: orderData.storeName,
          total: orderData.total,
          items: orderData.items,
          notes: orderData.notes,
        },
      });
    } catch (error) {
      console.error('Error enviando email al dueño:', error);
    }
  }
}