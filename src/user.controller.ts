import { Controller, Get, Inject, Query } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  @Inject()
  private userSerive: UserService;

  @Get()
  async getUserInfo(@Query('uuid') uuid: string) {
    return await this.userSerive.findOrCreate(uuid);
  }
}
