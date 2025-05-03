import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as path from 'path';

async function testFeatureDetection() {
  const client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 4003,
    },
  });

  try {
    // Test image path
    const testImagePath = path.join(process.cwd(), 'apps', 'basic-processing', 'test-images', 'WhatsApp Image 2025-04-05 at 19.20.08.jpeg');

    // Test Harris Corner Detection
    console.log('Testing Harris Corner Detection...');
    const harrisResult = await client.send({ cmd: 'harris_corner' }, {
      imagePath: testImagePath,
      k: 0.04,           // Harris parameter
      windowSize: 3,     // Gaussian window size
      thresh: 1e-5       // Corner response threshold
    }).toPromise();
    console.log('Harris Corner Detection result:', harrisResult);

    // Test Canny Edge Detection
    console.log('Testing Canny Edge Detection...');
    const cannyResult = await client.send({ cmd: 'canny_edge' }, {
      imagePath: testImagePath,
      lowThreshold: 20,
      highThreshold: 60,
      gaussianSize: 5,
      gaussianSigma: 1.4
    }).toPromise();
    console.log('Canny Edge Detection result:', cannyResult);

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await client.close();
  }
}

testFeatureDetection(); 