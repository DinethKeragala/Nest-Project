import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { convertToGreyscale } from '../../../common/utils/greyscale';

@Injectable()
export class HarrisSharpService {
  private readonly logger = new Logger(HarrisSharpService.name);

  @MessagePattern({ cmd: 'harris_corner' })
  async detectCorners(
    @Payload()
    data: {
      imagePath: string;
      k?: number;          // Harris free parameter (default 0.04)
      windowSize?: number; // Gaussian window size (default 3)
      thresh?: number;     // Response threshold (default 1e-5)
    },
  ) {
    const { imagePath, k = 0.04, windowSize = 3, thresh = 1e-5 } = data;
    if (!fs.existsSync(imagePath)) {
      return { error: 'Image not found', statusCode: 404 };
    }

    try {
      // Convert to greyscale
      const { buffer: gray, width, height } = await convertToGreyscale(imagePath);

      // Compute image derivatives using Sobel operator
      const { dx, dy } = this.computeDerivatives(gray, width!, height!);

      // Compute products of derivatives
      const dx2 = this.multiplyArrays(dx, dx);
      const dy2 = this.multiplyArrays(dy, dy);
      const dxdy = this.multiplyArrays(dx, dy);

      // Apply Gaussian window
      const window = this.createGaussianWindow(windowSize);
      const Sx2 = this.applyWindow(dx2, width!, height!, window);
      const Sy2 = this.applyWindow(dy2, width!, height!, window);
      const Sxy = this.applyWindow(dxdy, width!, height!, window);

      // Compute Harris response
      const R = this.computeHarrisResponse(Sx2, Sy2, Sxy, width!, height!, k);

      // Find corners using non-maximum suppression
      const corners = this.nonMaxSuppression(R, width!, height!, thresh);

      // Create output image with corners marked
      const outputBuffer = await this.markCorners(gray, width!, height!, corners);

      // Save the result
      const outputDir = path.join(process.cwd(), 'apps/feature-detection/output_images');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const outputPath = path.join(outputDir, `harris_corners_${path.basename(imagePath)}`);

      await sharp(outputBuffer, {
        raw: { width: width!, height: height!, channels: 1 },
      })
        .png()
        .toFile(outputPath);

      this.logger.log(`Detected ${corners.length} corners, saved to ${outputPath}`);
      return { corners: corners.slice(0, 20), outputPath };
    } catch (error) {
      this.logger.error(`Error in corner detection: ${error.message}`);
      return { error: error.message, statusCode: 500 };
    }
  }

  private computeDerivatives(image: Buffer, width: number, height: number): { dx: Float32Array; dy: Float32Array } {
    const dx = new Float32Array(width * height);
    const dy = new Float32Array(width * height);

    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = image[(y + ky) * width + (x + kx)];
            gx += pixel * sobelX[ky + 1][kx + 1];
            gy += pixel * sobelY[ky + 1][kx + 1];
          }
        }

        dx[y * width + x] = gx;
        dy[y * width + x] = gy;
      }
    }

    return { dx, dy };
  }

  private multiplyArrays(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] * b[i];
    }
    return result;
  }

  private createGaussianWindow(size: number): number[][] {
    const window: number[][] = [];
    const sigma = size / 6;
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let y = 0; y < size; y++) {
      window[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        window[y][x] = value;
        sum += value;
      }
    }

    // Normalize
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        window[y][x] /= sum;
      }
    }

    return window;
  }

  private applyWindow(image: Float32Array, width: number, height: number, window: number[][]): Float32Array {
    const result = new Float32Array(width * height);
    const size = window.length;
    const offset = Math.floor(size / 2);

    for (let y = offset; y < height - offset; y++) {
      for (let x = offset; x < width - offset; x++) {
        let sum = 0;

        for (let ky = -offset; ky <= offset; ky++) {
          for (let kx = -offset; kx <= offset; kx++) {
            const pixel = image[(y + ky) * width + (x + kx)];
            sum += pixel * window[ky + offset][kx + offset];
          }
        }

        result[y * width + x] = sum;
      }
    }

    return result;
  }

  private computeHarrisResponse(
    Sx2: Float32Array,
    Sy2: Float32Array,
    Sxy: Float32Array,
    width: number,
    height: number,
    k: number
  ): Float32Array {
    const R = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const det = Sx2[idx] * Sy2[idx] - Sxy[idx] * Sxy[idx];
        const trace = Sx2[idx] + Sy2[idx];
        R[idx] = det - k * trace * trace;
      }
    }

    return R;
  }

  private nonMaxSuppression(R: Float32Array, width: number, height: number, thresh: number): { x: number; y: number; r: number }[] {
    const corners: { x: number; y: number; r: number }[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const val = R[idx];

        if (val > thresh) {
          let isMax = true;

          // Check 8-connected neighborhood
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              if (kx === 0 && ky === 0) continue;
              const neighborIdx = (y + ky) * width + (x + kx);
              if (val <= R[neighborIdx]) {
                isMax = false;
                break;
              }
            }
            if (!isMax) break;
          }

          if (isMax) {
            corners.push({ x, y, r: val });
          }
        }
      }
    }

    return corners;
  }

  private async markCorners(image: Buffer, width: number, height: number, corners: { x: number; y: number; r: number }[]): Promise<Buffer> {
    const output = Buffer.from(image);
    const radius = 3;

    for (const corner of corners) {
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          const nx = corner.x + x;
          const ny = corner.y + y;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const dist = Math.sqrt(x * x + y * y);
            if (dist <= radius) {
              output[ny * width + nx] = 255; // Mark corner with white pixel
            }
          }
        }
      }
    }

    return output;
  }
}
