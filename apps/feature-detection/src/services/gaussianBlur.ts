// Utility to generate a Gaussian kernel
function generateGaussianKernel(size: number, sigma: number): number[][] {
  const kernel: number[][] = [];
  const mean = Math.floor(size / 2);
  let sum = 0;

  // Generate the kernel
  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - mean;
      const dy = y - mean;
      // Gaussian function: (1/(2πσ²)) * e^(-(x²+y²)/(2σ²))
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)) / (2 * Math.PI * sigma * sigma);
      kernel[y][x] = value;
      sum += value;
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

  // Process each pixel in the image
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;

      // Apply kernel to neighborhood
      for (let ky = -kHalf; ky <= kHalf; ky++) {
        for (let kx = -kHalf; kx <= kHalf; kx++) {
          // Get input pixel coordinates with boundary handling
          const px = Math.min(Math.max(x + kx, 0), width - 1);
          const py = Math.min(Math.max(y + ky, 0), height - 1);
          
          // Get pixel value and kernel weight
          const pixel = input[py * width + px];
          const weight = kernel[ky + kHalf][kx + kHalf];
          
          sum += pixel * weight;
        }
      }

      // Store result
      output[y * width + x] = Math.min(Math.max(Math.round(sum), 0), 255);
    }
  }

  return output;
}

// Exported blur function
export function applyGaussianBlur(
  input: Buffer,
  width: number,
  height: number,
  size: number = 5,
  sigma: number = 1.0
): Buffer {
  const kernel = generateGaussianKernel(size, sigma);
  return convolve(input, width, height, kernel);
}
