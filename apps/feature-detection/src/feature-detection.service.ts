/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CannyEdgeDetectionService } from './services/cannyEdgeDetection.service';
import { HarrisSharpService } from './services/Hariscorner.service';

@Injectable()
export class FeatureDetectionService {
  constructor(
    private readonly cannyEdgeService: CannyEdgeDetectionService,
    private readonly harrisSharpService: HarrisSharpService
  ) { }

  @MessagePattern({ cmd: 'canny_edge' })
  async cannyEdgeDetection(data: {
    imagePath: string;
    lowThreshold?: number;
    highThreshold?: number;
    gaussianSize?: number;
    gaussianSigma?: number;
  }) {
    return await this.cannyEdgeService.detectEdges(data);
  }

  @MessagePattern({ cmd: 'harris_corner' })
  async detectCorners(data: {
    imagePath: string;
    k?: number;
    windowSize?: number;
    thresh?: number;
  }) {
    return await this.harrisSharpService.detectCorners(data);
  }
}