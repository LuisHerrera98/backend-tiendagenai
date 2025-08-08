import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderStatus } from './entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async create(tenantId: string, createOrderDto: CreateOrderDto) {
    // Validar stock disponible
    for (const item of createOrderDto.items) {
      const product = await this.productModel.findOne({
        _id: item.productId,
        tenantId,
        active: true
      });

      if (!product) {
        throw new BadRequestException(`Producto ${item.productName} no encontrado`);
      }

      const stockItem = product.stock.find(s => 
        s.size_id?.toString() === item.sizeId || s.size_name === item.sizeName
      );

      if (!stockItem || stockItem.quantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${item.productName} talle ${item.sizeName}`
        );
      }
    }

    // Calcular totales
    let subtotal = 0;
    const itemsWithSubtotal = createOrderDto.items.map(item => {
      const itemSubtotal = item.price * item.quantity * (1 - item.discount / 100);
      subtotal += itemSubtotal;
      return {
        ...item,
        subtotal: itemSubtotal
      };
    });

    // Generar número de orden único
    const orderCount = await this.orderModel.countDocuments({ tenantId });
    const orderNumber = `ORD-${Date.now()}-${orderCount + 1}`;

    // Crear orden
    const order = new this.orderModel({
      tenantId,
      orderNumber,
      customerName: createOrderDto.customerName,
      customerPhone: createOrderDto.customerPhone,
      customerEmail: createOrderDto.customerEmail,
      items: itemsWithSubtotal,
      subtotal,
      discount: 0,
      total: subtotal,
      status: 'pending',
      notes: createOrderDto.notes,
    });

    const savedOrder = await order.save();

    // Actualizar stock temporalmente
    for (const item of createOrderDto.items) {
      await this.productModel.updateOne(
        {
          _id: item.productId,
          tenantId,
          'stock.size_id': item.sizeId
        },
        {
          $inc: {
            'stock.$.quantity': -item.quantity
          }
        }
      );
    }

    return {
      order: savedOrder,
      message: 'Pedido creado exitosamente'
    };
  }

  async findAll(tenantId: string, status?: OrderStatus) {
    const query: any = { tenantId };
    if (status) {
      query.status = status;
    }

    return this.orderModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100);
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.orderModel.findOne({
      _id: id,
      tenantId
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return order;
  }

  async updateStatus(tenantId: string, id: string, status: OrderStatus) {
    const order = await this.findOne(tenantId, id);

    // Si se cancela el pedido, devolver stock
    if (status === 'cancelado' && order.status !== 'cancelado' && order.status !== 'entregado') {
      for (const item of order.items) {
        await this.productModel.updateOne(
          {
            _id: item.productId,
            tenantId,
            'stock.size_id': item.sizeId
          },
          {
            $inc: {
              'stock.$.quantity': item.quantity
            }
          }
        );
      }
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    return {
      order,
      message: 'Estado actualizado exitosamente'
    };
  }

  async getStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, pendingOrders] = await Promise.all([
      this.orderModel.countDocuments({ tenantId }),
      this.orderModel.countDocuments({ 
        tenantId, 
        createdAt: { $gte: today } 
      }),
      this.orderModel.countDocuments({ 
        tenantId, 
        status: 'pending' 
      })
    ]);

    const revenueResult = await this.orderModel.aggregate([
      { $match: { tenantId, status: { $ne: 'cancelado' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const todayRevenueResult = await this.orderModel.aggregate([
      { 
        $match: { 
          tenantId, 
          status: { $ne: 'cancelado' },
          createdAt: { $gte: today }
        } 
      },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    return {
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      todayRevenue: todayRevenueResult[0]?.total || 0
    };
  }
}
