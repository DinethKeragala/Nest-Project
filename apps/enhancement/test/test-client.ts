import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as path from 'path';

async function testEnhancement() {
  const client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 4002,
    },
  });

  try {
    // Test image path
    const testImagePath = path.join(process.cwd(), 'apps', 'basic-processing', 'test-images', 'WhatsApp Image 2025-04-05 at 19.20.08.jpeg');

    // Test flood fill
    console.log('Testing flood fill...');
    const floodFillResult = await client.send({ cmd: 'flood_fill' }, {
      imagePath: testImagePath,
      sr: 100,
      sc: 100,
      newColor: [255, 0, 0] as [number, number, number],
      tolerance: 10
    }).toPromise();
    console.log('Flood fill result:', floodFillResult);

    // Test histogram equalization
    console.log('Testing histogram equalization...');
    const histogramResult = await client.send({ cmd: 'histogram_equalization' }, testImagePath).toPromise();
    console.log('Histogram equalization result:', histogramResult);

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await client.close();
  }
}

testEnhancement(); 