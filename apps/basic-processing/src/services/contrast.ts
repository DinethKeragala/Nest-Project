/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ContrastService {
  @MessagePattern({ cmd: 'adjust_contrast' })
  async adjust(data: { imagePath: string; contrast: number }) {
    try {
      const { imagePath, contrast } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      // Validate contrast value
      if (contrast < -100 || contrast > 100) {
        throw new Error('Contrast value must be between -100 and 100');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = `contrast_${contrast}.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Read the input image
      const inputImage = await fs.promises.readFile(imagePath);
      const { data: inputBuffer, info: inputInfo } = await sharp(inputImage)
        .raw()
        .toBuffer({ resolveWithObject: true });

      if (!inputInfo.channels || inputInfo.channels !== 3) {
        throw new Error('Image must be RGB (3 channels)');
      }

      // Convert contrast value to factor (0 to 2)
      const factor = (contrast + 100) / 100;

      // Apply contrast adjustment
      const contrastedBuffer = Buffer.alloc(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        const value = inputBuffer[i];
        // Apply contrast formula: f = (value - 128) * factor + 128
        const newValue = (value - 128) * factor + 128;
        contrastedBuffer[i] = Math.round(Math.max(0, Math.min(255, newValue)));
      }

      // Save the contrasted image
      await sharp(contrastedBuffer, {
        raw: {
          width: inputInfo.width,
          height: inputInfo.height,
          channels: inputInfo.channels,
        },
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
