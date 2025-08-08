import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGenderDto } from './dto/create-gender.dto';
import { UpdateGenderDto } from './dto/update-gender.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Gender } from './entities/gender.entity';
import { Model } from 'mongoose';

@Injectable()
export class GenderService {

  constructor(
    @InjectModel(Gender.name)
    private readonly genderModel: Model<Gender>
  ) {}

  async create(tenantId: string, createGenderDto: CreateGenderDto) {
    try {
      const genderData = {
        ...createGenderDto,
        name: createGenderDto.name?.toUpperCase(),
        tenantId
      };
      const gender = await this.genderModel.create(genderData);
      return gender;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe un género con ese nombre',
          error: 'DUPLICATE_GENDER',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al crear el género: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const genders = await this.genderModel.find({ tenantId }).sort({ name: 1 });
      return genders;
    } catch (error) {
      throw new BadRequestException('Error al obtener los géneros: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const gender = await this.genderModel.findOne({ _id: id, tenantId });
      
      if (!gender) {
        throw new NotFoundException('Género no encontrado');
      }
      
      return gender;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener el género: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateGenderDto: UpdateGenderDto) {
    try {
      const updateData = {
        ...updateGenderDto,
        name: updateGenderDto.name?.toUpperCase()
      };
      const gender = await this.genderModel.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true }
      );
      
      if (!gender) {
        throw new NotFoundException('Género no encontrado');
      }
      
      return gender;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe un género con ese nombre',
          error: 'DUPLICATE_GENDER',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al actualizar el género: ' + error.message);
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      const gender = await this.genderModel.findOneAndDelete({ _id: id, tenantId });
      
      if (!gender) {
        throw new NotFoundException('Género no encontrado');
      }
      
      return { message: 'Género eliminado exitosamente', gender };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar el género: ' + error.message);
    }
  }
}
