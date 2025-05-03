/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { HistogramEqualizationService } from './services/histrogramEqualization.service';
import { FloodFillService } from './services/floodfill.service';
import { MessagePattern } from '@nestjs/microservices';

@Injectable()
export class EnhancementService {
  constructor(
    private readonly histogramService: HistogramEqualizationService,
    private readonly floodFillService: FloodFillService,
  ) { }

  @MessagePattern({ cmd: 'histogram_equalization' })
  async histogramEqualization(imagePath: string) {
    return await this.histogramService.equalizeHistogram(imagePath);
  }

  @MessagePattern({ cmd: 'flood_fill' })
  async floodFill(data: {
    imagePath: string;
    sr: number;
    sc: number;
    newColor: [number, number, number];
    tolerance?: number;
  }) {
    return await this.floodFillService.floodFill(data);
  }
}