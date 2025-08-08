import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTypeDto } from './dto/create-type.dto';
import { UpdateTypeDto } from './dto/update-type.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Type } from './entities/type.entity';
import { Model } from 'mongoose';

@Injectable()
export class TypeService {

  constructor(
    @InjectModel(Type.name)
    private readonly typeModel: Model<Type>
  ) {}

  async create(tenantId: string, createTypeDto: CreateTypeDto) {
    try {
      const typeData = {
        ...createTypeDto,
        name: createTypeDto.name?.toUpperCase(),
        tenantId
      };
      const type = await this.typeModel.create(typeData);
      return type;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe un tipo con ese nombre',
          error: 'DUPLICATE_TYPE',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al crear el tipo: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const types = await this.typeModel.find({ tenantId }).sort({ name: 1 });
      return types;
    } catch (error) {
      throw new BadRequestException('Error al obtener los tipos: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const type = await this.typeModel.findOne({ _id: id, tenantId });
      
      if (!type) {
        throw new NotFoundException('Tipo no encontrado');
      }
      
      return type;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener el tipo: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateTypeDto: UpdateTypeDto) {
    try {
      const updateData = {
        ...updateTypeDto,
        name: updateTypeDto.name?.toUpperCase()
      };
      const type = await this.typeModel.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true }
      );
      
      if (!type) {
        throw new NotFoundException('Tipo no encontrado');
      }
      
      return type;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe un tipo con ese nombre',
          error: 'DUPLICATE_TYPE',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al actualizar el tipo: ' + error.message);
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      const type = await this.typeModel.findOneAndDelete({ _id: id, tenantId });
      
      if (!type) {
        throw new NotFoundException('Tipo no encontrado');
      }
      
      return { message: 'Tipo eliminado exitosamente', type };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar el tipo: ' + error.message);
    }
  }
}
