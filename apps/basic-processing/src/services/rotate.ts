import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RotateService {
  private rotatePixels(
    inputBuffer: Buffer,
    width: number,
    height: number,
    angle: number
  ): Buffer {
    const channels = 3;
    const outputBuffer = Buffer.alloc(width * height * channels);
    const angleRad = (angle * Math.PI) / 180;
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate the position in the original image
        const dx = x - centerX;
        const dy = y - centerY;
        
        const rotatedX = Math.round(dx * Math.cos(angleRad) - dy * Math.sin(angleRad) + centerX);
        const rotatedY = Math.round(dx * Math.sin(angleRad) + dy * Math.cos(angleRad) + centerY);

        // Check if the rotated coordinates are within bounds
        if (
          rotatedX >= 0 &&
          rotatedX < width &&
          rotatedY >= 0 &&
          rotatedY < height
        ) {
          const sourceIndex = (rotatedY * width + rotatedX) * channels;
          const targetIndex = (y * width + x) * channels;
          
          // Copy all channels
          for (let c = 0; c < channels; c++) {
            outputBuffer[targetIndex + c] = inputBuffer[sourceIndex + c];
          }
        }
      }
    }

    return outputBuffer;
  }

  @MessagePattern({ cmd: 'rotate_image' })
  async rotate(data: { imagePath: string; angle: number }) {
    try {
      const { imagePath, angle } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFileName = `rotated_${angle}_image.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const { data: imageData, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rotatedBuffer = this.rotatePixels(
        imageData,
        info.width,
        info.height,
        angle
      );

      await sharp(rotatedBuffer, {
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
        message: 'Image rotated successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Rotation error:', error);
      return {
        success: false,
        message: 'Failed to rotate image',
        error: error.message,
      };
    }
  }
}