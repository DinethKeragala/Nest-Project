import * as sharp from 'sharp';

export async function convertToGreyscale(imagePath: string): Promise<{ buffer: Buffer, width: number, height: number }> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });

  console.log('Image info:', {
    width: info.width,
    height: info.height,
    channels: info.channels,
    totalPixels: info.width * info.height,
    inputBufferSize: data.length,
    expectedBufferSize: info.width * info.height * info.channels
  });

  // Create a new buffer with the same size as input (3 channels)
  const greyscaleBuffer = Buffer.alloc(data.length);

  // Convert RGB to grayscale using the standard formula: Y = 0.299R + 0.587G + 0.114B
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate grayscale value using the standard formula
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    // Store the same grayscale value in all three channels
    greyscaleBuffer[i] = y;     // R channel
    greyscaleBuffer[i + 1] = y; // G channel
    greyscaleBuffer[i + 2] = y; // B channel
  }

  return {
    buffer: greyscaleBuffer,
    width: info.width,
    height: info.height
  };
}