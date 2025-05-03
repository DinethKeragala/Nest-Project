export function doubleThreshold(
  imageData: Buffer,
  width: number,
  height: number,
  lowThreshold: number,
  highThreshold: number
): { strongEdges: Buffer; weakEdges: Buffer } {
  const strongEdges = Buffer.alloc(imageData.length);
  const weakEdges = Buffer.alloc(imageData.length);

  for (let i = 0; i < imageData.length; i++) {
    const pixel = imageData[i];

    if (pixel >= highThreshold) {
      strongEdges[i] = 255;
      weakEdges[i] = 0;
    } else if (pixel >= lowThreshold) {
      strongEdges[i] = 0;
      weakEdges[i] = 255;
    } else {
      strongEdges[i] = 0;
      weakEdges[i] = 0;
    }
  }

  return { strongEdges, weakEdges };
}
