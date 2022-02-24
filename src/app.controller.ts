import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Request } from 'express';
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

  @Get('musics')
  async getMusics() {
    return this.appService.getMusics();
  }

  @Get('like')
  async getMyLike(@Req() req: Request) {
    const uuid = req.headers['user_uuid'] ?? null;
    return await this.appService.getMyLike(uuid);
  }

  @Post('like')
  async like(@Req() req: Request, @Body('path') path: string) {
    const uuid = req.headers['user_uuid'] ?? null;
    return await this.appService.likeOne(uuid, path);
  }
}
