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

  async create(createGenderDto: CreateGenderDto) {
    try {
      const genderData = {
        ...createGenderDto,
        name: createGenderDto.name?.toUpperCase()
      };
      const gender = await this.genderModel.create(genderData);
      return gender;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Ya existe un género con ese nombre');
      }
      throw new BadRequestException('Error al crear el género: ' + error.message);
    }
  }

  async findAll() {
    try {
      const genders = await this.genderModel.find().sort({ name: 1 });
      return genders;
    } catch (error) {
      throw new BadRequestException('Error al obtener los géneros: ' + error.message);
    }
  }

  async findOne(id: string) {
    try {
      const gender = await this.genderModel.findById(id);
      
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

  async update(id: string, updateGenderDto: UpdateGenderDto) {
    try {
      const updateData = {
        ...updateGenderDto,
        name: updateGenderDto.name?.toUpperCase()
      };
      const gender = await this.genderModel.findByIdAndUpdate(
        id,
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
        throw new BadRequestException('Ya existe un género con ese nombre');
      }
      throw new BadRequestException('Error al actualizar el género: ' + error.message);
    }
  }

  async remove(id: string) {
    try {
      const gender = await this.genderModel.findByIdAndDelete(id);
      
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
