import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RotateService {
  @MessagePattern({ cmd: 'rotate_image' })
  async rotate(imagePath: string, angle: number) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      if (angle < 0 || angle > 360) {
        throw new Error('Angle must be between 0 and 360 degrees');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFile = path.join(outputDir, 'rotated_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels = 3 } = metadata;

      const imageBuffer = await image.raw().toBuffer();
      const rotatedBuffer = this.rotateImage(
        imageBuffer,
        width!,
        height!,
        channels,
        angle
      );

      await sharp(rotatedBuffer, {
        raw: {
          width: width!,
          height: height!,
          channels,
        },
      })
        .png()
        .toFile(outputFile);

      return {
        success: true,
        message: 'Image rotated successfully',
        savedImagePath: outputFile,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to rotate image',
        error: err.message,
      };
    }
  }

  private rotateImage(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number,
    angle: number
  ): Buffer {
    const result = Buffer.alloc(imageData.length);
    const radians = (angle * Math.PI) / 180;

    // Calculate center points
    const centerX = (width - 1) / 2;
    const centerY = (height - 1) / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate source coordinates
        const dx = x - centerX;
        const dy = y - centerY;

        const srcX = Math.round(centerX + dx * Math.cos(radians) - dy * Math.sin(radians));
        const srcY = Math.round(centerY + dx * Math.sin(radians) + dy * Math.cos(radians));

        if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
          for (let c = 0; c < channels; c++) {
            const srcIndex = (srcY * width + srcX) * channels + c;
            const dstIndex = (y * width + x) * channels + c;
            result[dstIndex] = imageData[srcIndex];
          }
        } else {
          for (let c = 0; c < channels; c++) {
            const dstIndex = (y * width + x) * channels + c;
            result[dstIndex] = 0; // Fill with black for out-of-bounds pixels
          }
        }
      }
    }

    return result;
  }
}