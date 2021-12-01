import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import * as twitchStream from 'twitch-streamlink-extractor';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('twitch')
  getTwitch(@Query('channel') channel: string) {
    return twitchStream.extract(
      channel,
      'kimne78kx3ncx6brgo4mv6wki5h1ko',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
      'loYuleQH9NelYZIQv1vcXYP8QeGKy7Mq',
    );
  }
}
