export function doubleThreshold(input: Float32Array, width: number, height: number, low: number, high: number): {
  strongEdges: Uint8Array;
  weakEdges: Uint8Array;
} {
  const strong = new Uint8Array(width * height);
  const weak = new Uint8Array(width * height);

  // Find max value for relative thresholding
  let maxVal = 0;
  for (let i = 0; i < input.length; i++) {
    maxVal = Math.max(maxVal, input[i]);
  }

  // Calculate threshold values
  const highThreshold = maxVal * (high / 255);
  const lowThreshold = highThreshold * (low / high);

  // Apply double threshold
  for (let i = 0; i < input.length; i++) {
    if (input[i] >= highThreshold) {
      strong[i] = 255;
    } else if (input[i] >= lowThreshold) {
      weak[i] = 255;
    }
  }

  return { strongEdges: strong, weakEdges: weak };
}
