export function hysteresis(strongEdges: Buffer, weakEdges: Buffer, width: number, height: number): Buffer {
  const result = Buffer.from(strongEdges);
  const dx = [-1, -1, -1, 0, 0, 1, 1, 1];
  const dy = [-1, 0, 1, -1, 1, -1, 0, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;

      if (weakEdges[index] === 255) {
        let isConnected = false;

        // Check 8-connected neighbors
        for (let i = 0; i < 8; i++) {
          const newX = x + dx[i];
          const newY = y + dy[i];
          const neighborIndex = newY * width + newX;

          if (strongEdges[neighborIndex] === 255) {
            isConnected = true;
            break;
          }
        }

        if (isConnected) {
          result[index] = 255;
        } else {
          result[index] = 0;
        }
      }
    }
  }

  return result;
}