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

  async create(createTypeDto: CreateTypeDto) {
    try {
      const typeData = {
        ...createTypeDto,
        name: createTypeDto.name?.toUpperCase()
      };
      const type = await this.typeModel.create(typeData);
      return type;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Ya existe un tipo con ese nombre');
      }
      throw new BadRequestException('Error al crear el tipo: ' + error.message);
    }
  }

  async findAll() {
    try {
      const types = await this.typeModel.find().sort({ name: 1 });
      return types;
    } catch (error) {
      throw new BadRequestException('Error al obtener los tipos: ' + error.message);
    }
  }

  async findOne(id: string) {
    try {
      const type = await this.typeModel.findById(id);
      
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

  async update(id: string, updateTypeDto: UpdateTypeDto) {
    try {
      const updateData = {
        ...updateTypeDto,
        name: updateTypeDto.name?.toUpperCase()
      };
      const type = await this.typeModel.findByIdAndUpdate(
        id,
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
        throw new BadRequestException('Ya existe un tipo con ese nombre');
      }
      throw new BadRequestException('Error al actualizar el tipo: ' + error.message);
    }
  }

  async remove(id: string) {
    try {
      const type = await this.typeModel.findByIdAndDelete(id);
      
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
