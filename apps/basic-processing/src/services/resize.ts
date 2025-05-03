/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ResizeService {
  @MessagePattern({ cmd: 'resize_image' })
  async resize(imagePath: string, width: number, height: number) {
    try {
      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      if (width <= 0 || height <= 0) {
        throw new Error('Width and height must be positive numbers');
      }

      const outputDir = path.join(process.cwd(), 'apps/basic-processing/output_images');
      const outputFile = path.join(outputDir, 'resized_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width: originalWidth, height: originalHeight } = metadata;

      // Calculate scaling factors while maintaining aspect ratio
      const scaleX = width / originalWidth!;
      const scaleY = height / originalHeight!;
      const scale = Math.min(scaleX, scaleY);

      const newWidth = Math.round(originalWidth! * scale);
      const newHeight = Math.round(originalHeight! * height);

      const imageBuffer = await image.raw().toBuffer();
      const resizedBuffer = this.bilinearInterpolation(
        imageBuffer,
        originalWidth!,
        originalHeight!,
        newWidth,
        newHeight,
        metadata.channels || 3
      );

      await sharp(resizedBuffer, {
        raw: {
          width: newWidth,
          height: newHeight,
          channels: metadata.channels || 3,
        },
      })
        .png()
        .toFile(outputFile);

      return {
        success: true,
        message: 'Image resized successfully',
        savedImagePath: outputFile,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to resize image',
        error: err.message,
      };
    }
  }

  private bilinearInterpolation(
    imageData: Buffer,
    width: number,
    height: number,
    newWidth: number,
    newHeight: number,
    channels: number
  ): Buffer {
    const result = Buffer.alloc(newWidth * newHeight * channels);

    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = (x * width) / newWidth;
        const srcY = (y * height) / newHeight;

        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = Math.min(x1 + 1, width - 1);
        const y2 = Math.min(y1 + 1, height - 1);

        const dx = srcX - x1;
        const dy = srcY - y1;

        for (let c = 0; c < channels; c++) {
          const p1 = imageData[(y1 * width + x1) * channels + c];
          const p2 = imageData[(y1 * width + x2) * channels + c];
          const p3 = imageData[(y2 * width + x1) * channels + c];
          const p4 = imageData[(y2 * width + x2) * channels + c];

          const interpolated = Math.round(
            p1 * (1 - dx) * (1 - dy) +
            p2 * dx * (1 - dy) +
            p3 * (1 - dx) * dy +
            p4 * dx * dy
          );

          result[(y * newWidth + x) * channels + c] = Math.min(255, Math.max(0, interpolated));
        }
      }
    }

    return result;
  }
}