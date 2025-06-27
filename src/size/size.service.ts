import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Size } from './entities/size.entity';
import { Model } from 'mongoose';

@Injectable()
export class SizeService {

  constructor(
    @InjectModel(Size.name)
    private readonly sizeModel: Model<Size>
  ) {}

  async create(createSizeDto: CreateSizeDto) {
    try {
      const sizeData = {
        ...createSizeDto,
        name: createSizeDto.name?.toUpperCase()
      };

      // Verificar si ya existe una talla con el mismo nombre en la misma categoría
      const existingSize = await this.sizeModel.findOne({
        name: sizeData.name,
        category_id: createSizeDto.category_id
      });

      if (existingSize) {
        throw new BadRequestException(`Ya existe una talla "${sizeData.name}" en esta categoría`);
      }

      const size = await this.sizeModel.create(sizeData);
      return size;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la talla: ' + error.message);
    }
  }

  async findAll() {
    try {
      const sizes = await this.sizeModel.find().sort({ name: 1 });
      return sizes;
    } catch (error) {
      throw new BadRequestException('Error al obtener las tallas: ' + error.message);
    }
  }

  async findAllByCategory(categoryId: string) {
    try {
      const sizes = await this.sizeModel.find({ category_id: categoryId }).sort({ name: 1 });
      return sizes;
    } catch (error) {
      throw new BadRequestException('Error al obtener las tallas por categoría: ' + error.message);
    }
  }

  async findOne(id: string) {
    try {
      const size = await this.sizeModel.findById(id);
      
      if (!size) {
        throw new NotFoundException('Talla no encontrada');
      }
      
      return size;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener la talla: ' + error.message);
    }
  }

  async update(id: string, updateSizeDto: UpdateSizeDto) {
    try {
      // Si se está actualizando el nombre o la categoría, verificar duplicados
      if (updateSizeDto.name || updateSizeDto.category_id) {
        const currentSize = await this.sizeModel.findById(id);
        if (!currentSize) {
          throw new NotFoundException('Talla no encontrada');
        }

        const nameToCheck = updateSizeDto.name?.toUpperCase() || currentSize.name;
        const categoryToCheck = updateSizeDto.category_id || currentSize.category_id;

        const existingSize = await this.sizeModel.findOne({
          name: nameToCheck,
          category_id: categoryToCheck,
          _id: { $ne: id } // Excluir el registro actual
        });

        if (existingSize) {
          throw new BadRequestException(`Ya existe una talla "${nameToCheck}" en esta categoría`);
        }
      }

      const updateData = {
        ...updateSizeDto,
        name: updateSizeDto.name?.toUpperCase()
      };

      const size = await this.sizeModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );
      
      if (!size) {
        throw new NotFoundException('Talla no encontrada');
      }
      
      return size;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar la talla: ' + error.message);
    }
  }

  async remove(id: string) {
    try {
      const size = await this.sizeModel.findByIdAndDelete(id);
      
      if (!size) {
        throw new NotFoundException('Talla no encontrada');
      }
      
      return { message: 'Talla eliminada exitosamente', size };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar la talla: ' + error.message);
    }
  }
}