import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('sid')
  async getSid() {
    return this.appService.getSid();
  }

  @Get('random')
  async getRandom() {
    return this.appService.getRandom();
  }

  @Get('criteria')
  async getCriteria() {
    return this.appService.getCriteria();
  }

  @Get('songs')
  async getSongs() {
    return this.appService.getSongs();
  }
}
