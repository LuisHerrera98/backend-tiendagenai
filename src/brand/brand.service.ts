import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Brand } from './entities/brand.entity';
import { Model } from 'mongoose';

@Injectable()
export class BrandService {

  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<Brand>
  ) {}

  async create(tenantId: string, createBrandDto: CreateBrandDto) {
    try {
      const brandData = {
        ...createBrandDto,
        name: createBrandDto.name?.toUpperCase(),
        tenantId
      };
      const brand = await this.brandModel.create(brandData);
      return brand;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe una marca con ese nombre',
          error: 'DUPLICATE_BRAND',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al crear la marca: ' + error.message);
    }
  }

  async findAll(tenantId: string) {
    try {
      const brands = await this.brandModel.find({ tenantId }).sort({ name: 1 });
      return brands;
    } catch (error) {
      throw new BadRequestException('Error al obtener las marcas: ' + error.message);
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const brand = await this.brandModel.findOne({ _id: id, tenantId });
      
      if (!brand) {
        throw new NotFoundException('Marca no encontrada');
      }
      
      return brand;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener la marca: ' + error.message);
    }
  }

  async update(tenantId: string, id: string, updateBrandDto: UpdateBrandDto) {
    try {
      const updateData = {
        ...updateBrandDto,
        name: updateBrandDto.name?.toUpperCase()
      };
      const brand = await this.brandModel.findOneAndUpdate(
        { _id: id, tenantId },
        updateData,
        { new: true }
      );
      
      if (!brand) {
        throw new NotFoundException('Marca no encontrada');
      }
      
      return brand;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 11000) {
        throw new BadRequestException({
          message: 'Ya existe una marca con ese nombre',
          error: 'DUPLICATE_BRAND',
          statusCode: 400
        });
      }
      throw new BadRequestException('Error al actualizar la marca: ' + error.message);
    }
  }

  async remove(tenantId: string, id: string) {
    try {
      const brand = await this.brandModel.findOneAndDelete({ _id: id, tenantId });
      
      if (!brand) {
        throw new NotFoundException('Marca no encontrada');
      }
      
      return { message: 'Marca eliminada exitosamente', brand };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar la marca: ' + error.message);
    }
  }
}