import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as path from 'path';

async function testImageProcessing() {
  const client: ClientProxy = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 4001,
    },
  });

  try {
    // Test image path - using the existing test image
    const testImagePath = path.join(process.cwd(), 'apps', 'basic-processing', 'test-images', 'WhatsApp Image 2025-04-05 at 19.20.08.jpeg');

    // Test greyscale conversion
    console.log('Testing greyscale conversion...');
    const greyscaleResult = await client.send({ cmd: 'convert_greyscale' }, { imagePath: testImagePath }).toPromise();
    console.log('Greyscale result:', greyscaleResult);

    // Test resize
    console.log('Testing image resize...');
    const resizeResult = await client.send({ cmd: 'resize_image' }, {
      imagePath: testImagePath,
      width: 800,
      height: 600
    }).toPromise();
    console.log('Resize result:', resizeResult);

    // Test negative
    console.log('Testing negative conversion...');
    const negativeResult = await client.send({ cmd: 'create_negative' }, testImagePath).toPromise();
    console.log('Negative result:', negativeResult);

    // Test contrast adjustment
    console.log('Testing contrast adjustment...');
    const contrastResult = await client.send({ cmd: 'adjust_contrast' }, {
      imagePath: testImagePath,
      contrast: 1.5
    }).toPromise();
    console.log('Contrast result:', contrastResult);

    // Test rotation
    console.log('Testing image rotation...');
    const rotateResult = await client.send({ cmd: 'rotate_image' }, {
      imagePath: testImagePath,
      angle: 90
    }).toPromise();
    console.log('Rotation result:', rotateResult);

    // Test sharpening
    console.log('Testing image sharpening...');
    const sharpenResult = await client.send({ cmd: 'sharpen_image' }, testImagePath).toPromise();
    console.log('Sharpen result:', sharpenResult);

    // Test embossing
    console.log('Testing image embossing...');
    const embossResult = await client.send({ cmd: 'emboss_image' }, testImagePath).toPromise();
    console.log('Emboss result:', embossResult);

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await client.close();
  }
}

testImageProcessing(); 