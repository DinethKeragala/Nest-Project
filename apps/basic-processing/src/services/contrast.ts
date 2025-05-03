/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContrastService {
  private applyContrast(imageData: Buffer, width: number, height: number, channels: number, contrast: number): Buffer {
    const result = Buffer.alloc(imageData.length);
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < imageData.length; i++) {
      const pixel = imageData[i];
      const newValue = factor * (pixel - 128) + 128;
      result[i] = Math.max(0, Math.min(255, Math.round(newValue)));
    }
    return result;
  }

  @MessagePattern({ cmd: 'adjust_contrast' })
  async adjust(data: { imagePath: string; contrast: number }) {
    try {
      const { imagePath, contrast } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = `contrast_${contrast}_image.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const { data: imageData, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const contrastedBuffer = this.applyContrast(
        imageData,
        info.width,
        info.height,
        info.channels,
        contrast
      );

      await sharp(contrastedBuffer, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels
        }
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Contrast adjusted successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Contrast adjustment error:', error);
      return {
        success: false,
        message: 'Failed to adjust contrast',
        error: error.message,
      };
    }
  }
}
