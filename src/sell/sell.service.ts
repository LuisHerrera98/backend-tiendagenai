import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSellDto } from './dto/create-sell.dto';
import { UpdateSellDto } from './dto/update-sell.dto';
import { Sell, DateSell } from './entities/sell.entity';
import { Product } from '../product/entities/product.entity';
import { ClientCreditService } from '../client-credit/client-credit.service';

@Injectable()
export class SellService {
  constructor(
    @InjectModel(Sell.name) private sellModel: Model<Sell>,
    @InjectModel(DateSell.name) private dateSellModel: Model<DateSell>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private clientCreditService: ClientCreditService,
  ) {}

  async registerSell(tenantId: string, createSellDto: CreateSellDto) {
    try {
      // Verificar que el producto existe y tiene stock
      const product = await this.productModel.findOne({ _id: createSellDto.product_id, tenantId });
      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      // Buscar el stock específico del talle
      const stockItem = product.stock.find(s => s.size_id === createSellDto.size_id);
      if (!stockItem || stockItem.quantity <= 0) {
        throw new BadRequestException('No hay stock disponible para esta talla');
      }

      // Crear o encontrar la fecha de venta para hoy
      const today = new Date();
      today.setHours(today.getHours() - 3); // UTC-3
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      let dateSell = await this.dateSellModel.findOne({ name: todayStr, tenantId });
      if (!dateSell) {
        dateSell = new this.dateSellModel({
          name: todayStr,
          date: today,
          tenantId
        });
        await dateSell.save();
      }

      // Crear la venta
      const now = new Date();
      const sell = new this.sellModel({
        dateSell_id: dateSell._id,
        product_name: createSellDto.product_name,
        size_name: createSellDto.size_name,
        price: createSellDto.price,
        cost: createSellDto.cost,
        images: createSellDto.images,
        method_payment: createSellDto.method_payment || 'efectivo',
        transaction_id: createSellDto.transaction_id || null,
        tenantId
      });

      const savedSell = await sell.save();

      // Usar créditos si se especificó un documento de cliente
      let creditsUsed = null;
      if (createSellDto.client_document && createSellDto.credit_used && createSellDto.credit_used > 0) {
        creditsUsed = await this.clientCreditService.useCredits(
          createSellDto.client_document,
          createSellDto.credit_used,
          savedSell._id.toString()
        );
      }

      // Reducir el stock del producto directamente
      await this.productModel.findOneAndUpdate(
        { 
          _id: createSellDto.product_id,
          'stock.size_id': createSellDto.size_id,
          tenantId
        },
        { 
          $inc: { 'stock.$.quantity': -1 } 
        }
      );

      return {
        message: 'Venta registrada exitosamente',
        sell: savedSell,
        stockReduced: true,
        creditsUsed,
        finalAmount: createSellDto.price - (createSellDto.credit_used || 0)
      };
    } catch (error) {
      throw new BadRequestException('Error al registrar venta: ' + error.message);
    }
  }

  create(tenantId: string, createSellDto: CreateSellDto) {
    return this.registerSell(tenantId, createSellDto);
  }

  async findAll(tenantId: string, startDate?: string, endDate?: string) {
    try {
      const query: any = { tenantId };
      
      if (startDate || endDate) {
        // Si es el mismo día (día específico), buscar por nombre directo
        if (startDate && endDate && startDate === endDate) {
          const specificDate = await this.dateSellModel.findOne({ name: startDate, tenantId });
          if (specificDate) {
            query.dateSell_id = specificDate._id;
          } else {
            return []; // No hay ventas en ese día específico
          }
        } else {
          // Buscar ventas por rango de fechas
          const dateQuery: any = {};
          
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(start.getHours() - 3); // UTC-3
            dateQuery.$gte = start;
          }
          
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Final del día
            end.setHours(end.getHours() - 3); // UTC-3
            dateQuery.$lte = end;
          }
          
          // Buscar las fechas que coinciden
          const matchingDates = await this.dateSellModel.find({ date: dateQuery, tenantId });
          const dateIds = matchingDates.map(d => d._id);
          
          if (dateIds.length > 0) {
            query.dateSell_id = { $in: dateIds };
          } else {
            return []; // No hay ventas en el rango especificado
          }
        }
      }

      const sells = await this.sellModel.find(query)
        .populate('dateSell_id', 'name date')
        .sort({ 'dateSell_id': -1, createdAt: -1 });

      return sells;
    } catch (error) {
      throw new BadRequestException('Error al obtener ventas: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const sell = await this.sellModel.findOne({ _id: id, tenantId })
        .populate('dateSell_id', 'name date');
      
      if (!sell) {
        throw new NotFoundException('Venta no encontrada');
      }
      
      return sell;
    } catch (error) {
      throw new BadRequestException('Error al obtener venta: ' + error.message);
    }
  }

  async update(id: string, updateSellDto: UpdateSellDto) {
    try {
      const sell = await this.sellModel.findByIdAndUpdate(id, updateSellDto, { new: true })
        .populate('dateSell_id', 'name date');
      
      if (!sell) {
        throw new NotFoundException('Venta no encontrada');
      }
      
      return {
        message: 'Venta actualizada exitosamente',
        sell,
      };
    } catch (error) {
      throw new BadRequestException('Error al actualizar venta: ' + error.message);
    }
  }

  async remove(id: string) {
    try {
      const sell = await this.sellModel.findByIdAndDelete(id);
      
      if (!sell) {
        throw new NotFoundException('Venta no encontrada');
      }
      
      return {
        message: 'Venta eliminada exitosamente',
        sell,
      };
    } catch (error) {
      throw new BadRequestException('Error al eliminar venta: ' + error.message);
    }
  }

  async getSalesStats(startDate?: string, endDate?: string) {
    try {
      const allSells = await this.findAll(startDate, endDate);
      
      // Filtrar solo ventas que no estén anuladas por cambio
      const activeSells = allSells.filter(sell => sell.exchange_type !== 'anulada_por_cambio');
      
      const stats = {
        totalSales: activeSells.length,
        totalRevenue: activeSells.reduce((sum, sell) => sum + sell.price, 0),
        totalCost: activeSells.reduce((sum, sell) => sum + sell.cost, 0),
        totalProfit: 0,
        averageSaleValue: 0,
        salesByDate: {},
        paymentMethodBreakdown: {
          efectivo: { count: 0, total: 0 },
          transferencia: { count: 0, total: 0 },
          tarjeta: { count: 0, total: 0 },
          qr: { count: 0, total: 0 },
          no_aplica: { count: 0, total: 0 }
        },
      };
      
      stats.totalProfit = stats.totalRevenue - stats.totalCost;
      stats.averageSaleValue = stats.totalSales > 0 ? stats.totalRevenue / stats.totalSales : 0;
      
      // Agrupar ventas por fecha y método de pago (solo activas)
      const salesByDate = {};
      activeSells.forEach(sell => {
        const date = (sell.dateSell_id as any)?.name || 'unknown';
        if (!salesByDate[date]) {
          salesByDate[date] = {
            count: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        salesByDate[date].count++;
        salesByDate[date].revenue += sell.price;
        salesByDate[date].cost += sell.cost;
        salesByDate[date].profit = salesByDate[date].revenue - salesByDate[date].cost;
        
        // Agregar al breakdown de métodos de pago
        const paymentMethod = sell.method_payment || 'efectivo';
        if (stats.paymentMethodBreakdown[paymentMethod]) {
          stats.paymentMethodBreakdown[paymentMethod].count++;
          stats.paymentMethodBreakdown[paymentMethod].total += sell.price;
        }
      });
      
      stats.salesByDate = salesByDate;
      
      return stats;
    } catch (error) {
      throw new BadRequestException('Error al obtener estadísticas: ' + error.message);
    }
  }
}