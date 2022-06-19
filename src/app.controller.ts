import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('build')
  async build() {
    return this.appService.build();
  }

  @Get('hot')
  async hot() {
    return this.appService.hot();
  }

  @Get('sid')
  async getSid() {
    return '';
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

  @Get('musics')
  async getMusics() {
    return this.appService.getMusics();
  }

  @Get('paths')
  async getPaths() {
    return this.appService.getPaths();
  }

  @Get('like')
  async getMyLike(@Req() req: Request) {
    const uuid = req.headers['useruuid'] ?? null;
    return await this.appService.getMyLike(uuid);
  }

  @Post('like')
  async like(@Req() req: Request, @Body('path') path: string) {
    const uuid = req.headers['useruuid'] ?? null;
    return await this.appService.likeOne(uuid, path);
  }

  @Get('lrc')
  async getLrc(@Query('title') title) {
    return await this.appService.getLrc(title);
  }

  @Post('lrc')
  async contributeLrc(@Body('title') title, @Body('lrc') lrc) {
    return await this.appService.contributeLrc(title, lrc);
  }
}
