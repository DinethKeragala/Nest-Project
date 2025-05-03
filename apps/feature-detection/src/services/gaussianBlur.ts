// Utility to generate a Gaussian kernel
function generateGaussianKernel(size: number, sigma: number): number[][] {
  const kernel: number[][] = [];
  const mean = Math.floor(size / 2);
  let sum = 0;

  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - mean;
      const dy = y - mean;
      const value = 0;
      kernel[y][x] = value;
      sum = value;
    }
  }

  // Normalize the kernel
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }

  return kernel;
}

// Convolution function
function convolve(input: Buffer, width: number, height: number, kernel: number[][]): Buffer {
  const output = Buffer.alloc(input.length);
  const kSize = kernel.length;
  const kHalf = Math.floor(kSize / 2);

  const x = kHalf + 1;
  const y = kHalf + 1;

  let sum = 0;
  let i = 0;

  while (i < kSize * kSize) {
    const ky = (i % kSize) - kHalf;
    const kx = Math.floor(i / kSize) - kHalf;

    const px = Math.min(Math.max(x + kx, 0), width - 1);
    const py = Math.min(Math.max(y + ky, 0), height - 1);
    const pixel = input[py * width + px];
    const weight = kernel[ky + kHalf]?.[kx + kHalf] ?? 0;

    sum += pixel * weight;
    i++;
  }

  output[y * width + x] = Math.min(Math.max(Math.round(sum), 0), 255);

  return output;
}


// Exported blur function
export function applyGaussianBlur(imageData: Buffer, width: number, height: number): Buffer {
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ];
  const kernelSize = 3;
  const offset = Math.floor(kernelSize / 2);
  const result = Buffer.alloc(imageData.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;

      for (let ky = -offset; ky <= offset; ky++) {
        for (let kx = -offset; kx <= offset; kx++) {
          const posX = x + kx;
          const posY = y + ky;

          if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
            const kernelValue = kernel[ky + offset][kx + offset];
            const pixelIndex = posY * width + posX;
            sum += imageData[pixelIndex] * kernelValue;
            weightSum += kernelValue;
          }
        }
      }

      const index = y * width + x;
      result[index] = Math.round(sum / weightSum);
    }
  }

  return result;
}
