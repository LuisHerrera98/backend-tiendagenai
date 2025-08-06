import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { CreateMassiveExchangeDto } from './dto/create-massive-exchange.dto';
import { UpdateExchangeDto } from './dto/update-exchange.dto';
import { Exchange } from './entities/exchange.entity';
import { Sell } from '../sell/entities/sell.entity';
import { Product } from '../product/entities/product.entity';
import { ClientCreditService } from '../client-credit/client-credit.service';

@Injectable()
export class ExchangeService {
  constructor(
    @InjectModel(Exchange.name) private exchangeModel: Model<Exchange>,
    @InjectModel(Sell.name) private sellModel: Model<Sell>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private clientCreditService: ClientCreditService,
  ) {}

  async create(createExchangeDto: CreateExchangeDto) {
    try {
      // 1. Obtener la venta original
      const originalSell = await this.sellModel.findById(createExchangeDto.original_sell_id)
        .populate('dateSell_id');
      
      if (!originalSell) {
        throw new NotFoundException('Venta original no encontrada');
      }

      // 2. Obtener el producto nuevo
      const newProduct = await this.productModel.findById(createExchangeDto.new_product_id);
      if (!newProduct) {
        throw new NotFoundException('Producto nuevo no encontrado');
      }

      // 3. Verificar que el nuevo talle tiene stock
      const newSizeStock = newProduct.stock.find(s => s.size_id === createExchangeDto.new_size_id);
      if (!newSizeStock || newSizeStock.quantity <= 0) {
        throw new BadRequestException('No hay stock disponible para el talle seleccionado');
      }

      // 4. Encontrar el producto original para devolver stock
      const originalProduct = await this.productModel.findOne({
        name: originalSell.product_name
      });

      if (!originalProduct) {
        throw new NotFoundException('Producto original no encontrado en inventario');
      }

      // 5. Calcular diferencia de precio
      const priceDifference = newProduct.price - originalSell.price;

      // 6. Crear el registro de cambio
      const exchange = new this.exchangeModel({
        original_sell_id: createExchangeDto.original_sell_id,
        original_product_name: originalSell.product_name,
        original_size_name: originalSell.size_name,
        original_price: originalSell.price,
        original_cost: originalSell.cost,
        original_images: originalSell.images,
        new_product_id: createExchangeDto.new_product_id,
        new_product_name: newProduct.name,
        new_size_id: createExchangeDto.new_size_id,
        new_size_name: newSizeStock.size_name,
        new_price: newProduct.price,
        new_cost: newProduct.cost,
        new_images: newProduct.images,
        price_difference: priceDifference,
        payment_method_difference: createExchangeDto.payment_method_difference || 'no_aplica',
        notes: createExchangeDto.notes || ''
      });

      const savedExchange = await exchange.save();

      // 7. Verificar si es el mismo producto o producto diferente
      const isSameProduct = originalSell.product_name === newProduct.name;

      if (isSameProduct) {
        // Es el mismo producto, solo cambio de talle - actualizar solo el talle, NO el precio/costo
        await this.sellModel.findByIdAndUpdate(createExchangeDto.original_sell_id, {
          size_name: newSizeStock.size_name,
          related_exchange_id: savedExchange._id,
          // NO cambiar exchange_type - mantener "normal"
          // NO cambiar price ni cost - mantener originales
          size_change_info: {
            original_size: originalSell.size_name,
            new_size: newSizeStock.size_name,
            changed_at: new Date()
          },
          $inc: { exchange_count: 1 }
        });
      } else {
        // Es producto diferente - anular la venta original
        // Cambiar el costo de la venta original para que su ganancia sea 0
        await this.sellModel.findByIdAndUpdate(createExchangeDto.original_sell_id, {
          exchange_type: 'anulada_por_cambio',
          related_exchange_id: savedExchange._id,
          cost: originalSell.price, // Costo = precio para que ganancia = 0
          new_product_info: [{
            name: newProduct.name,
            size_name: newSizeStock.size_name,
            price: newProduct.price,
            images: newProduct.images
          }]
        });
      }

      // 8. Crear nueva venta solo si es producto diferente
      let newSell = null;
      if (!isSameProduct) {
        const today = new Date();
        today.setHours(today.getHours() - 3); // UTC-3
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Buscar o crear fecha de venta para hoy
        const DateSell = this.sellModel.db.model('DateSell');
        let dateSell = await DateSell.findOne({ name: todayStr });
        if (!dateSell) {
          dateSell = new DateSell({
            name: todayStr,
            date: today,
          });
          await dateSell.save();
        }

        // Crear la nueva venta con timestamp más reciente
        const now = new Date();
        now.setHours(now.getHours() - 3); // UTC-3
        now.setSeconds(now.getSeconds() + 5); // Agregar 5 segundos para que aparezca arriba
        
        // Calcular el costo ajustado para que la ganancia sea solo del producto nuevo
        const newProductGain = newProduct.price - newProduct.cost; // Ganancia real del producto nuevo
        const adjustedCost = originalSell.price - newProductGain;   // Costo para mantener ingreso original
        
        newSell = new this.sellModel({
          dateSell_id: dateSell._id,
          product_name: newProduct.name,
          size_name: newSizeStock.size_name,
          price: originalSell.price, // Mantener ingreso original ($120,000)
          cost: adjustedCost,        // Costo ajustado para ganancia correcta
          images: newProduct.images,
          method_payment: createExchangeDto.payment_method_difference || 'no_aplica',
          exchange_type: 'nueva_por_cambio',
          related_exchange_id: savedExchange._id,
          original_product_info: [{
            name: originalSell.product_name,
            size_name: originalSell.size_name,
            price: originalSell.price,
            images: originalSell.images
          }],
          exchange_count: (originalSell.exchange_count || 0) + 1,
          createdAt: now, // Timestamp completo para ordenamiento correcto
        });

        await newSell.save();
      }

      // 9. Ajustar stocks
      if (isSameProduct) {
        // Es el mismo producto, solo cambio de talle
        // Solo necesitamos hacer un intercambio de stock entre talles
        const originalSizeStock = originalProduct.stock.find(s => s.size_name === originalSell.size_name);
        const newSizeIsOriginalSize = originalSell.size_name === newSizeStock.size_name;
        
        if (!newSizeIsOriginalSize) {
          // Solo ajustar stock si realmente cambió el talle
          // Devolver 1 unidad al talle original
          if (originalSizeStock) {
            await this.productModel.findOneAndUpdate(
              { 
                _id: originalProduct._id,
                'stock.size_id': originalSizeStock.size_id
              },
              { 
                $inc: { 'stock.$.quantity': 1 } 
              }
            );
          }

          // Reducir 1 unidad del nuevo talle
          await this.productModel.findOneAndUpdate(
            { 
              _id: createExchangeDto.new_product_id,
              'stock.size_id': createExchangeDto.new_size_id
            },
            { 
              $inc: { 'stock.$.quantity': -1 } 
            }
          );
        }
        // Si es el mismo talle, no hay cambio de stock necesario
      } else {
        // Es producto diferente - lógica original
        // Devolver stock del producto original
        const originalSizeStock = originalProduct.stock.find(s => s.size_name === originalSell.size_name);
        if (originalSizeStock) {
          await this.productModel.findOneAndUpdate(
            { 
              _id: originalProduct._id,
              'stock.size_id': originalSizeStock.size_id
            },
            { 
              $inc: { 'stock.$.quantity': 1 } 
            }
          );
        }

        // Reducir stock del producto nuevo
        await this.productModel.findOneAndUpdate(
          { 
            _id: createExchangeDto.new_product_id,
            'stock.size_id': createExchangeDto.new_size_id
          },
          { 
            $inc: { 'stock.$.quantity': -1 } 
          }
        );
      }

      // 10. Manejar diferencia a favor del cliente (crear crédito si es necesario)
      let creditCreated = null;
      if (priceDifference < 0 && createExchangeDto.credit_action === 'create_credit' && createExchangeDto.client_document) {
        const creditAmount = Math.abs(priceDifference);
        
        creditCreated = await this.clientCreditService.create({
          document_number: createExchangeDto.client_document,
          phone: createExchangeDto.client_phone || '',
          client_name: createExchangeDto.client_name || '',
          amount: creditAmount,
          original_sale_amount: originalSell.price,
          reason: `Diferencia a favor por cambio de producto: ${originalSell.product_name} → ${newProduct.name}`,
          related_exchange_id: savedExchange._id.toString(),
          notes: createExchangeDto.notes || ''
        });
      }

      return {
        message: 'Cambio registrado exitosamente',
        exchange: savedExchange,
        new_sale: newSell,
        price_difference: priceDifference,
        requires_payment: priceDifference > 0,
        client_credit: priceDifference < 0 ? Math.abs(priceDifference) : 0,
        credit_created: creditCreated
      };
    } catch (error) {
      throw new BadRequestException('Error al procesar cambio: ' + error.message);
    }
  }

  async findAll(startDate?: string, endDate?: string) {
    try {
      const query: any = {};
      
      if (startDate || endDate) {
        const dateQuery: any = {};
        
        if (startDate) {
          dateQuery.$gte = startDate;
        }
        
        if (endDate) {
          dateQuery.$lte = endDate;
        }
        
        query.exchange_date = dateQuery;
      }

      const exchanges = await this.exchangeModel.find(query)
        .populate('original_sell_id')
        .sort({ exchange_date: -1, exchange_time: -1 });

      return exchanges;
    } catch (error) {
      throw new BadRequestException('Error al obtener cambios: ' + error.message);
    }
  }

  async findOne(id: string) {
    try {
      const exchange = await this.exchangeModel.findById(id)
        .populate('original_sell_id');
      
      if (!exchange) {
        throw new NotFoundException('Cambio no encontrado');
      }
      
      return exchange;
    } catch (error) {
      throw new BadRequestException('Error al obtener cambio: ' + error.message);
    }
  }

  async update(id: string, updateExchangeDto: UpdateExchangeDto) {
    try {
      const exchange = await this.exchangeModel.findByIdAndUpdate(id, updateExchangeDto, { new: true })
        .populate('original_sell_id');
      
      if (!exchange) {
        throw new NotFoundException('Cambio no encontrado');
      }
      
      return {
        message: 'Cambio actualizado exitosamente',
        exchange,
      };
    } catch (error) {
      throw new BadRequestException('Error al actualizar cambio: ' + error.message);
    }
  }

  async remove(id: string) {
    try {
      const exchange = await this.exchangeModel.findById(id);
      
      if (!exchange) {
        throw new NotFoundException('Cambio no encontrado');
      }

      // Revertir cambios de stock si es necesario
      if (exchange.status === 'completado') {
        // Revertir stock del producto original (quitar la devolución)
        const originalProduct = await this.productModel.findOne({
          name: exchange.original_product_name
        });

        if (originalProduct) {
          const originalSizeStock = originalProduct.stock.find(s => s.size_name === exchange.original_size_name);
          if (originalSizeStock) {
            await this.productModel.findOneAndUpdate(
              { 
                _id: originalProduct._id,
                'stock.size_id': originalSizeStock.size_id
              },
              { 
                $inc: { 'stock.$.quantity': -1 } 
              }
            );
          }
        }

        // Revertir stock del producto nuevo (devolver el stock)
        await this.productModel.findOneAndUpdate(
          { 
            _id: exchange.new_product_id,
            'stock.size_id': exchange.new_size_id
          },
          { 
            $inc: { 'stock.$.quantity': 1 } 
          }
        );
      }

      await this.exchangeModel.findByIdAndDelete(id);
      
      return {
        message: 'Cambio eliminado exitosamente y stock revertido',
      };
    } catch (error) {
      throw new BadRequestException('Error al eliminar cambio: ' + error.message);
    }
  }

  async getExchangeStats(startDate?: string, endDate?: string) {
    try {
      const exchanges = await this.findAll(startDate, endDate);
      
      const stats = {
        totalExchanges: exchanges.length,
        totalPriceDifference: exchanges.reduce((sum, ex) => sum + ex.price_difference, 0),
        exchangesWithPayment: exchanges.filter(ex => ex.price_difference > 0).length,
        exchangesWithCredit: exchanges.filter(ex => ex.price_difference < 0).length,
        exchangesByStatus: {
          completado: exchanges.filter(ex => ex.status === 'completado').length,
          pendiente: exchanges.filter(ex => ex.status === 'pendiente').length,
          cancelado: exchanges.filter(ex => ex.status === 'cancelado').length,
        }
      };
      
      return stats;
    } catch (error) {
      throw new BadRequestException('Error al obtener estadísticas de cambios: ' + error.message);
    }
  }

  async createMassiveExchange(createMassiveExchangeDto: CreateMassiveExchangeDto) {
    try {
      // 1. Obtener todas las ventas originales
      const originalSales = await this.sellModel.find({
        _id: { $in: createMassiveExchangeDto.original_sales.map(s => s.sale_id) }
      }).populate('dateSell_id');

      if (originalSales.length !== createMassiveExchangeDto.original_sales.length) {
        throw new NotFoundException('Algunas ventas originales no fueron encontradas');
      }

      // 2. Verificar que todas las ventas pertenecen a la misma transacción
      const transactionIds = [...new Set(originalSales.map(sale => sale.transaction_id).filter(Boolean))];
      if (transactionIds.length > 1) {
        throw new BadRequestException('Las ventas seleccionadas pertenecen a diferentes transacciones');
      }

      // 3. Obtener productos nuevos y verificar stock
      const newProducts = [];
      for (const newProductDto of createMassiveExchangeDto.new_products) {
        const product = await this.productModel.findById(newProductDto.product_id);
        if (!product) {
          throw new NotFoundException(`Producto ${newProductDto.product_name} no encontrado`);
        }

        const sizeStock = product.stock.find(s => s.size_id === newProductDto.size_id);
        if (!sizeStock || sizeStock.quantity <= 0) {
          throw new BadRequestException(`No hay stock disponible para ${newProductDto.product_name} talle ${newProductDto.size_name}`);
        }

        newProducts.push({
          ...newProductDto,
          product: product,
          sizeStock: sizeStock
        });
      }

      // 4. Calcular diferencias de precio
      const originalTotal = originalSales.reduce((sum, sale) => sum + sale.price, 0);
      const newTotal = newProducts.reduce((sum, item) => sum + item.product.price, 0);
      const priceDifference = newTotal - originalTotal;

      // 5. Crear el registro de cambio masivo
      const originalCostTotal = originalSales.reduce((sum, sale) => sum + sale.cost, 0);
      const newCostTotal = newProducts.reduce((sum, item) => sum + item.product.cost, 0);
      
      const exchange = new this.exchangeModel({
        original_sell_id: originalSales[0]._id, // Usar la primera venta como referencia
        original_product_name: `Cambio Masivo (${originalSales.length} productos)`,
        original_size_name: 'Multiple',
        original_price: originalTotal,
        original_cost: originalCostTotal,
        original_images: originalSales[0].images || [],
        new_product_id: newProducts[0].product._id, // Usar el primer producto como referencia
        new_product_name: `Cambio Masivo (${newProducts.length} productos)`,
        new_size_id: newProducts[0].size_id,
        new_size_name: 'Multiple',
        new_price: newTotal,
        new_cost: newCostTotal,
        new_images: newProducts[0].product.images || [],
        price_difference: priceDifference,
        payment_method_difference: createMassiveExchangeDto.payment_method_difference || 'no_aplica',
        exchange_date: new Date().toISOString().split('T')[0],
        exchange_time: new Date().toTimeString().slice(0, 5),
        notes: createMassiveExchangeDto.notes || `Cambio masivo: ${originalSales.length} productos originales por ${newProducts.length} productos nuevos`,
        status: 'completado',
        exchange_type: 'massive'
      });

      const savedExchange = await exchange.save();

      // 6. Actualizar stock - devolver productos originales
      for (const originalSale of originalSales) {
        const originalProduct = await this.productModel.findOne({
          name: originalSale.product_name
        });

        if (originalProduct) {
          const originalSizeStock = originalProduct.stock.find(s => s.size_name === originalSale.size_name);
          if (originalSizeStock) {
            await this.productModel.findOneAndUpdate(
              { 
                _id: originalProduct._id,
                'stock.size_id': originalSizeStock.size_id
              },
              { 
                $inc: { 'stock.$.quantity': 1 } 
              }
            );
          }
        }
      }

      // 7. Actualizar stock - quitar productos nuevos
      for (const newProductItem of newProducts) {
        await this.productModel.findOneAndUpdate(
          { 
            _id: newProductItem.product._id,
            'stock.size_id': newProductItem.size_id
          },
          { 
            $inc: { 'stock.$.quantity': -1 } 
          }
        );
      }

      // 8. Manejo correcto de finanzas por día
      const newSales = [];
      
      // SIEMPRE: 
      // 1. Anular ganancia de productos originales (costo = precio)
      // 2. Crear nuevas ventas en la fecha actual con los productos nuevos
      // 3. Solo cobrar/creditar la diferencia de precio

      const today = new Date();
      today.setHours(today.getHours() - 3); // UTC-3
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Buscar o crear fecha de venta para hoy
      const DateSell = this.sellModel.db.model('DateSell');
      let dateSellToday = await DateSell.findOne({ name: todayStr });
      if (!dateSellToday) {
        dateSellToday = new DateSell({
          name: todayStr,
          date: today,
        });
        await dateSellToday.save();
      }

      // 1. Anular ganancia de ventas originales (NO cambiar precio ni producto)
      for (const originalSale of originalSales) {
        await this.sellModel.findByIdAndUpdate(originalSale._id, {
          $set: {
            cost: originalSale.price, // Costo = precio para ganancia = 0
            exchange_type: 'anulada_por_cambio',
            related_exchange_id: savedExchange._id,
            new_product_info: newProducts.map(item => ({
              name: item.product_name,
              size_name: item.size_name,
              price: item.product.price,
              images: item.product.images || []
            }))
          },
          $inc: { exchange_count: 1 }
        });
      }

      // 2. Crear nuevas ventas HOY con los productos nuevos
      const now = new Date();
      now.setHours(now.getHours() - 3); // UTC-3
      
      for (const newProductItem of newProducts) {
        // El precio y costo deben reflejar la realidad del nuevo producto
        // pero ajustado para que las finanzas cuadren
        const newSale = new this.sellModel({
          dateSell_id: dateSellToday._id,
          product_name: newProductItem.product_name,
          size_name: newProductItem.size_name,
          price: newProductItem.product.price, // Precio real del producto nuevo
          cost: newProductItem.product.price - newProductItem.product.cost, // Costo ajustado para que ganancia = ganancia real del producto
          images: newProductItem.product.images || [],
          method_payment: createMassiveExchangeDto.payment_method_difference || 'efectivo',
          exchange_type: 'nueva_por_cambio',
          related_exchange_id: savedExchange._id,
          original_product_info: originalSales.map(sale => ({
            name: sale.product_name,
            size_name: sale.size_name,
            price: sale.price,
            images: sale.images || []
          })),
          createdAt: now
        });

        const savedNewSale = await newSale.save();
        newSales.push(savedNewSale);
      }

      // 3. Si hay diferencia de precio, crear venta adicional para la diferencia
      if (priceDifference !== 0) {
        const differenceSale = new this.sellModel({
          dateSell_id: dateSellToday._id,
          product_name: `Diferencia por cambio masivo`,
          size_name: 'N/A',
          price: Math.abs(priceDifference),
          cost: priceDifference > 0 ? 0 : Math.abs(priceDifference), // Si es positiva, toda es ganancia; si negativa, todo es costo
          images: [],
          method_payment: createMassiveExchangeDto.payment_method_difference || 'efectivo',
          exchange_type: 'diferencia_cambio',
          related_exchange_id: savedExchange._id,
          createdAt: now
        });

        if (priceDifference > 0) {
          // Cliente paga diferencia - registrar como venta adicional
          const savedDifferenceSale = await differenceSale.save();
          newSales.push(savedDifferenceSale);
        }
        // Si priceDifference < 0, se maneja con créditos, no con venta negativa
      }

      // 10. Manejar créditos si la diferencia es negativa
      let creditCreated = null;
      if (priceDifference < 0 && createMassiveExchangeDto.credit_action === 'create_credit' && createMassiveExchangeDto.client_document) {
        creditCreated = await this.clientCreditService.create({
          document_number: createMassiveExchangeDto.client_document,
          client_name: createMassiveExchangeDto.client_name || '',
          amount: Math.abs(priceDifference),
          original_sale_amount: originalTotal,
          reason: 'exchange',
          related_exchange_id: savedExchange._id.toString(),
          notes: `Crédito por cambio masivo - Exchange ID: ${savedExchange._id}`
        });
      }

      return {
        message: 'Cambio masivo procesado exitosamente',
        exchange: savedExchange,
        newSales: newSales,
        originalSalesCount: originalSales.length,
        newSalesCount: newSales.length,
        priceDifference: priceDifference,
        creditCreated: creditCreated
      };

    } catch (error) {
      console.error('Massive Exchange Error:', error);
      throw new BadRequestException('Error al procesar cambio masivo: ' + error.message);
    }
  }
}