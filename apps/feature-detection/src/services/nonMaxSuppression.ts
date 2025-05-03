export function nonMaxSuppression(
  magnitude: Buffer,
  direction: Buffer,
  width: number,
  height: number
): Buffer {
  const result = Buffer.alloc(magnitude.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const angle = direction[index];
      const mag = magnitude[index];

      // Round angle to nearest 45 degrees
      let roundedAngle = Math.round(angle / 45) * 45;
      if (roundedAngle < 0) roundedAngle += 180;
      if (roundedAngle >= 180) roundedAngle -= 180;

      let neighbor1 = 0;
      let neighbor2 = 0;

      // Get neighboring pixels based on gradient direction
      switch (roundedAngle) {
        case 0:
          neighbor1 = magnitude[index - 1];
          neighbor2 = magnitude[index + 1];
          break;
        case 45:
          neighbor1 = magnitude[index - width - 1];
          neighbor2 = magnitude[index + width + 1];
          break;
        case 90:
          neighbor1 = magnitude[index - width];
          neighbor2 = magnitude[index + width];
          break;
        case 135:
          neighbor1 = magnitude[index - width + 1];
          neighbor2 = magnitude[index + width - 1];
          break;
      }

      // Suppress non-maximum values
      if (mag >= neighbor1 && mag >= neighbor2) {
        result[index] = mag;
      } else {
        result[index] = 0;
      }
    }
  }

  return result;
}
