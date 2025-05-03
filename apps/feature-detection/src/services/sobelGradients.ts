export function computeSobelGradients(imageData: Buffer, width: number, height: number): { magnitude: Buffer; direction: Buffer } {
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

  const kernelSize = 3;
  const offset = Math.floor(kernelSize / 2);
  const magnitude = Buffer.alloc(imageData.length);
  const direction = Buffer.alloc(imageData.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -offset; ky <= offset; ky++) {
        for (let kx = -offset; kx <= offset; kx++) {
          const posX = x + kx;
          const posY = y + ky;

          if (posX >= 0 && posX < width && posY >= 0 && posY < height) {
            const pixelIndex = posY * width + posX;
            const pixelValue = imageData[pixelIndex];

            gx += pixelValue * sobelX[ky + offset][kx + offset];
            gy += pixelValue * sobelY[ky + offset][kx + offset];
          }
        }
      }

      const index = y * width + x;
      magnitude[index] = Math.round(Math.sqrt(gx * gx + gy * gy));
      direction[index] = Math.round((Math.atan2(gy, gx) * 180) / Math.PI);
    }
  }

  return { magnitude, direction };
}

