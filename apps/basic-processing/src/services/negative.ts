/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class NegativeService {
  @MessagePattern({ cmd: 'create_negative' })
  async createNegative(imagePath: string) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = 'negative_image.png';
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

      // Create negative image by inverting each channel
      const negativeBuffer = Buffer.alloc(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        negativeBuffer[i] = 255 - inputBuffer[i];
      }

      // Save the negative image
      await sharp(negativeBuffer, {
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
        message: 'Negative image created successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Negative image creation error:', error);
      return {
        success: false,
        message: 'Failed to create negative image',
        error: error.message,
      };
    }
  }
}