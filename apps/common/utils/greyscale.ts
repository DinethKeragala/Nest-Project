import * as sharp from 'sharp';
import { Buffer } from 'buffer';

export async function convertToGreyscale(imagePath: string): Promise<{ buffer: Buffer, width: number, height: number }> {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });

  const greyscaleBuffer = Buffer.alloc(info.width * info.height * 3);

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate luminance using standard formula: 0.299R + 0.587G + 0.114B
    const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    // Set the same value for R, G, and B channels to create grayscale
    greyscaleBuffer[i] = y;
    greyscaleBuffer[i + 1] = y;
    greyscaleBuffer[i + 2] = y;
  }

  return {
    buffer: greyscaleBuffer,
    width: info.width,
    height: info.height
  };
}