import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    productCode?: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {

      const uploadOptions: any = {
        width: 900,
        resource_type: 'auto',
      };

      if (productCode) {
        uploadOptions.transformation = [
          { width: 900, crop: 'scale' },
          {
            overlay: `text:Arial_16:${encodeURIComponent('id-' + productCode)}`,
            gravity: 'south',
            y: 50,
            x: -390,
            opacity: 90,
            co: 'white',
          },
        ];
      } else {
        uploadOptions.width = 900;
      }

      const upload = v2.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      toStream(file.buffer).pipe(upload);
    });
  }

  async deleteImage(publicId: string) {
    await v2.uploader.destroy(publicId);
  }
}