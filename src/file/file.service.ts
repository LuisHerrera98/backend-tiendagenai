import { Injectable, BadRequestException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

interface CloudinaryResponse {
  url: string;
  publicId: string;
  assetId?: string;
  version?: number;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

@Injectable()
export class FileService {
  constructor(private cloudinary: CloudinaryService) {}

  async uploadImageToCloudinary(
    files: Express.Multer.File[], 
    productCode?: string
  ): Promise<CloudinaryResponse[]> {
    if (files.length === 0) throw new BadRequestException('missing images');
    
    files.forEach((file) => {
      if (!file.mimetype.includes('image'))
        throw new BadRequestException(`File ${file.originalname} is not a valid image. Mimetype: ${file.mimetype}`);
    });

    const images: CloudinaryResponse[] = [];

    if (files) {
      for (let i = 0; i < files.length; i++) {
        try {
          const response = await this.cloudinary.uploadImage(files[i], productCode);
          
          if (response) {
            const imageData = {
              url: response.secure_url,
              publicId: response.public_id,
              assetId: response.asset_id,
              version: response.version,
              format: response.format,
              width: response.width,
              height: response.height,
              bytes: response.bytes
            };
            images.push(imageData);
          }
        } catch (error) {
          throw new BadRequestException(`Error uploading file ${files[i].originalname}: ${error.message}`);
        }
      }
    }

    return images;
  }
}