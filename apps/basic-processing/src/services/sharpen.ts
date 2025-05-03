import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SharpenService {
  // Do not change the this kernel
  private readonly strongKernel = [
    [-1, -1, -1],
    [-1, 9, -1],
    [-1, -1, -1],
  ];

  private applyConvolution(
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
                const kernelValue = this.strongKernel[ky + offset][kx + offset];
                const sourceIndex = (ny * width + nx) * channels + c;
                sum += imageData[sourceIndex] * kernelValue;
              }
            }
          }

          result[pixelIndex] = Math.min(255, Math.max(0, Math.round(sum)));
        }
      }
    }

    return result;
  }

  @MessagePattern({ cmd: 'sharpen_image' })
  async sharpenImage(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFilePath = path.join(outputDir, 'sharpened_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const { data: imageData, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const sharpened = this.applyConvolution(
        imageData,
        info.width,
        info.height,
        info.channels
      );

      await sharp(sharpened, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image sharpened successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Sharpening failed:', error);
      return {
        success: false,
        message: 'Image sharpening failed',
        error: error.message,
      };
    }
  }
}