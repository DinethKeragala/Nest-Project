import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

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

    // Load & preprocess image
    const input = fs.readFileSync(imagePath);
    const { data: buf, info } = await sharp(input)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info; // channels should be 1
    const img = Float32Array.from(buf).map(v => v / 255);

    // Helper to index (x,y) in flat array
    const idx = (x: number, y: number) => y * width + x;

    // Correct Sobel kernels for x and y derivatives
    const Sx = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    const Sy = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    // Proper convolution with boundary handling
    function convolve(kernel: number[][]): Float32Array {
      const out = new Float32Array(width * height);
      const kSize = kernel.length;
      const kHalf = Math.floor(kSize / 2);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let ky = -kHalf; ky <= kHalf; ky++) {
            for (let kx = -kHalf; kx <= kHalf; kx++) {
              const ix = x + kx;
              const iy = y + ky;
              
              // Mirror boundary conditions
              const px = Math.min(Math.max(ix, 0), width - 1);
              const py = Math.min(Math.max(iy, 0), height - 1);
              
              sum += img[idx(px, py)] * kernel[ky + kHalf][kx + kHalf];
            }
          }
          out[idx(x, y)] = sum;
        }
      }
      return out;
    }

    // Compute gradients
    const dx = convolve(Sx);
    const dy = convolve(Sy);

    // Compute products of derivatives
    const A = new Float32Array(width * height);
    const B = new Float32Array(width * height);
    const C = new Float32Array(width * height);
    for (let i = 0; i < A.length; i++) {
      A[i] = dx[i] * dx[i];
      B[i] = dy[i] * dy[i];
      C[i] = dx[i] * dy[i];
    }

    // Gaussian window (approximated by box blur)
    function boxBlur(dataArr: Float32Array): Float32Array {
      const out = new Float32Array(width * height);
      const w = windowSize;
      const r = Math.floor(w / 2);
      const area = (2 * r + 1) * (2 * r + 1);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sum = 0;
          for (let ky = -r; ky <= r; ky++) {
            for (let kx = -r; kx <= r; kx++) {
              const ix = Math.min(Math.max(x + kx, 0), width - 1);
              const iy = Math.min(Math.max(y + ky, 0), height - 1);
              sum += dataArr[idx(ix, iy)];
            }
          }
          out[idx(x, y)] = sum / area;
        }
      }
      return out;
    }

    const Sxx = boxBlur(A);
    const Syy = boxBlur(B);
    const Sxy = boxBlur(C);

    // Compute Harris response
    const R = new Float32Array(width * height);
    for (let i = 0; i < R.length; i++) {
      const det = Sxx[i] * Syy[i] - Sxy[i] * Sxy[i];
      const trace = Sxx[i] + Syy[i];
      R[i] = det - k * trace * trace;
    }

    // Non-maximum suppression with 8-neighborhood
    const corners: { x: number; y: number; r: number }[] = [];
    const dx8 = [-1, 0, 1, -1, 1, -1, 0, 1];
    const dy8 = [-1, -1, -1, 0, 0, 1, 1, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = idx(x, y);
        const val = R[i];
        
        if (val > thresh) {
          let isMax = true;
          // Check 8-neighborhood
          for (let n = 0; n < 8; n++) {
            const nx = x + dx8[n];
            const ny = y + dy8[n];
            if (val <= R[idx(nx, ny)]) {
              isMax = false;
              break;
            }
          }
          if (isMax) {
            corners.push({ x, y, r: val });
          }
        }
      }
    }

    // Sort corners by response strength
    corners.sort((a, b) => b.r - a.r);

    // Draw on a PNG via raw buffer
    const outBuf = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const src = img[idx(x, y)] * 255;
        const dstIdx = (y * width + x) * 3;
        outBuf[dstIdx] = src;
        outBuf[dstIdx + 1] = src;
        outBuf[dstIdx + 2] = src;
      }
    }

    // Draw corners with proper circle drawing
    const circleRadius = 3;
    corners.slice(0, 100).forEach(pt => {
      for (let dy = -circleRadius; dy <= circleRadius; dy++) {
        for (let dx = -circleRadius; dx <= circleRadius; dx++) {
          const nx = pt.x + dx;
          const ny = pt.y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= circleRadius) {
              const dstIdx = (ny * width + nx) * 3;
              outBuf[dstIdx] = 0;      // Red
              outBuf[dstIdx + 1] = 255; // Green
              outBuf[dstIdx + 2] = 0;   // Blue
            }
          }
        }
      }
    });

    const outputDir = path.join(process.cwd(), 'apps/feature-detection/output_images');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outPath = path.join(outputDir, `harris_sharp_${path.basename(imagePath)}`);
    await sharp(outBuf, { raw: { width, height, channels: 3 } })
      .png()
      .toFile(outPath);

    this.logger.log(`Detected ${corners.length} corners, saved to ${outPath}`);
    return {
      corners: corners.slice(0, 20),
      outputPath: outPath,
      totalCorners: corners.length
    };
  }
}
