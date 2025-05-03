import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmbossService {
  private readonly embossKernel = [
    [-2, -1, 0],
    [-1, 1, 1],
    [0, 1, 2]
  ];

  private applyKernel(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number
  ): Buffer {
    const result = Buffer.alloc(imageData.length);
    const offset = 1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          let sum = 0;
          const pixelIndex = (y * width + x) * channels + c;

          for (let ky = -offset; ky <= offset; ky++) {
            for (let kx = -offset; kx <= offset; kx++) {
              const nx = x + kx;
              const ny = y + ky;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const kernelValue = this.embossKernel[ky + offset][kx + offset];
                const sourceIndex = (ny * width + nx) * channels + c;
                sum += imageData[sourceIndex] * kernelValue;
              }
            }
          }

          // Add 128 to shift the range from [-255, 255] to [0, 255]
          result[pixelIndex] = Math.min(255, Math.max(0, Math.round(sum + 128)));
        }
      }
    }

    return result;
  }

  @MessagePattern({ cmd: 'emboss_image' })
  async embossImage(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFile = path.join(outputDir, 'emboss_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const { data: imageData, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const filtered = this.applyKernel(
        imageData,
        info.width,
        info.height,
        info.channels
      );

      await sharp(filtered, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .png()
        .toFile(outputFile);

      return {
        success: true,
        message: 'Image embossed successfully',
        savedImagePath: outputFile,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to apply filter',
        error: err.message,
      };
    }
  }
}
