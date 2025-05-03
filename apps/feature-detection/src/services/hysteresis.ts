export function hysteresis(strong: Uint8Array, weak: Uint8Array, width: number, height: number): Buffer {
  const result = Buffer.from(strong);

  const isStrong = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const idx = y * width + x;
    return strong[idx] === 255;
  };

  const hasStrongNeighbor = (x: number, y: number): boolean => {
    return (
      isStrong(x + 1, y) ||
      isStrong(x - 1, y) ||
      isStrong(x, y + 1) ||
      isStrong(x, y - 1) ||
      isStrong(x + 1, y + 1) ||
      isStrong(x + 1, y - 1) ||
      isStrong(x - 1, y + 1) ||
      isStrong(x - 1, y - 1)
    );
  };

  // Connect weak edges to strong edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (weak[idx] === 255 && hasStrongNeighbor(x, y)) {
        result[idx] = 255;
      } else if (weak[idx] === 255) {
        result[idx] = 0;
      }
    }
  }

  return result;
}