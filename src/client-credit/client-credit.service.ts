import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientCredit } from './entities/client-credit.entity';
import { CreateClientCreditDto } from './dto/create-client-credit.dto';

@Injectable()
export class ClientCreditService {
  constructor(
    @InjectModel(ClientCredit.name) private clientCreditModel: Model<ClientCredit>,
  ) {}

  async create(createClientCreditDto: CreateClientCreditDto) {
    try {
      const credit = new this.clientCreditModel(createClientCreditDto);
      return await credit.save();
    } catch (error) {
      throw new BadRequestException('Error al crear crédito: ' + error.message);
    }
  }

  async getActiveCredits(documentNumber: string) {
    try {
      const credits = await this.clientCreditModel.find({
        $or: [
          { document_number: documentNumber },
          { phone: documentNumber }
        ],
        status: 'active'
        // No filtrar por expires_at - los créditos no expiran hasta que se usan
      }).sort({ created_at: 1 }); // Más antiguos primero

      return credits;
    } catch (error) {
      throw new BadRequestException('Error al obtener créditos: ' + error.message);
    }
  }

  async getTotalActiveCredits(documentNumber: string): Promise<number> {
    try {
      const credits = await this.getActiveCredits(documentNumber);
      return credits.reduce((total, credit) => total + credit.amount, 0);
    } catch (error) {
      throw new BadRequestException('Error al calcular créditos: ' + error.message);
    }
  }

  async useCredits(documentNumber: string, amountToUse: number, saleId: string) {
    try {
      const credits = await this.getActiveCredits(documentNumber);
      const totalAvailable = credits.reduce((total, credit) => total + credit.amount, 0);

      if (totalAvailable < amountToUse) {
        throw new BadRequestException('Créditos insuficientes');
      }

      let remainingToUse = amountToUse;
      const usedCredits = [];

      for (const credit of credits) {
        if (remainingToUse <= 0) break;

        if (credit.amount <= remainingToUse) {
          // Usar todo el crédito
          await this.clientCreditModel.findByIdAndUpdate(credit._id, {
            status: 'used',
            used_in_sale_id: saleId,
            used_at: new Date(),
            expires_at: new Date() // Se marca como expirado cuando se usa
          });
          usedCredits.push({ creditId: credit._id, amountUsed: credit.amount });
          remainingToUse -= credit.amount;
        } else {
          // Usar parcialmente el crédito
          await this.clientCreditModel.findByIdAndUpdate(credit._id, {
            amount: credit.amount - remainingToUse
          });
          
          // Crear un nuevo registro para la parte usada
          const usedCredit = new this.clientCreditModel({
            document_number: credit.document_number,
            phone: credit.phone,
            client_name: credit.client_name,
            amount: remainingToUse,
            original_sale_amount: credit.original_sale_amount,
            reason: `Parte de crédito usado - ${credit.reason}`,
            related_exchange_id: credit.related_exchange_id,
            status: 'used',
            used_in_sale_id: saleId,
            used_at: new Date(),
            expires_at: new Date() // Se marca como expirado cuando se usa
          });
          await usedCredit.save();

          usedCredits.push({ creditId: credit._id, amountUsed: remainingToUse });
          remainingToUse = 0;
        }
      }

      return {
        totalUsed: amountToUse,
        usedCredits,
        remainingCredits: totalAvailable - amountToUse
      };
    } catch (error) {
      throw new BadRequestException('Error al usar créditos: ' + error.message);
    }
  }

  async findAll() {
    try {
      return await this.clientCreditModel.find().sort({ created_at: -1 });
    } catch (error) {
      throw new BadRequestException('Error al obtener créditos: ' + error.message);
    }
  }

  async getClientCreditsHistory(documentNumber: string) {
    try {
      return await this.clientCreditModel.find({
        $or: [
          { document_number: documentNumber },
          { phone: documentNumber }
        ]
      }).sort({ created_at: -1 });
    } catch (error) {
      throw new BadRequestException('Error al obtener historial: ' + error.message);
    }
  }
}