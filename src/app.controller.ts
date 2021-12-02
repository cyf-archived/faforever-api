import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('criteria')
  async getCriteria() {
    return this.appService.getCriteria();
  }

  @Get('songs')
  async getSongs(@Query('name') name: string) {
    return this.appService.getSongs(name);
  }
}
