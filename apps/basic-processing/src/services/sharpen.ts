import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SharpenService {
  // Sharpening kernel
  private readonly sharpenKernel = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0]
  ];

  private readonly kernelSize = 3;
  private readonly kernelOffset = Math.floor(this.kernelSize / 2);
  private readonly kernelWeightSum = this.calculateKernelWeightSum();

  private calculateKernelWeightSum(): number {
    let sum = 0;
    for (let y = 0; y < this.kernelSize; y++) {
      for (let x = 0; x < this.kernelSize; x++) {
        sum += Math.abs(this.sharpenKernel[y][x]);
      }
    }
    return sum;
  }

  private applyConvolution(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number
  ): Buffer {
    const result = Buffer.alloc(imageData.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < channels; c++) {
          let sum = 0;

          for (let ky = -this.kernelOffset; ky <= this.kernelOffset; ky++) {
            for (let kx = -this.kernelOffset; kx <= this.kernelOffset; kx++) {
              const posX = x + kx;
              const posY = y + ky;

              if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
                const kernelValue = this.sharpenKernel[ky + this.kernelOffset][kx + this.kernelOffset];
                const pixelIndex = (posY * width + posX) * channels + c;
                sum += imageData[pixelIndex] * kernelValue;
              }
            }
          }

          const index = (y * width + x) * channels + c;
          result[index] = Math.min(255, Math.max(0, Math.round(sum / this.kernelWeightSum)));
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
      const outputFile = path.join(outputDir, 'sharpened_image.png');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels = 3 } = metadata;

      const imageBuffer = await image.raw().toBuffer();
      const sharpenedBuffer = this.applyConvolution(imageBuffer, width!, height!, channels);

      await sharp(sharpenedBuffer, {
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
        message: 'Image sharpened successfully',
        savedImagePath: outputFile,
      };
    } catch (err) {
      return {
        success: false,
        message: 'Failed to sharpen image',
        error: err.message,
      };
    }
  }
}