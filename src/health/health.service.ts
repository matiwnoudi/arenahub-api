import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthService {
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'ArenaHub API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
