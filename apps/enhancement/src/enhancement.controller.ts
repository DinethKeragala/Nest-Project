/* eslint-disable prettier/prettier */
import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { EnhancementService } from './enhancement.service';

@Controller()
export class EnhancementController {
  constructor(private readonly enhancementService: EnhancementService) { }

  @EventPattern({ cmd: 'histogram_equalization' })
  async handleHistogramEqualization(imagePath: string) {
    console.log('Received image for histogram equalization');
    return await this.enhancementService.histogramEqualization(imagePath);
  }

  @EventPattern({ cmd: 'flood_fill' })
  async handleFloodFill(data: {
    imagePath: string;
    sr: number;
    sc: number;
    newColor: [number, number, number];
    tolerance?: number;
  }) {
    console.log('Received image for flood fill');
    return await this.enhancementService.floodFill(data);
  }
}
