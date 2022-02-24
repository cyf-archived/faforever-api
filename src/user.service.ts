import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserService {
  @Inject()
  private prismaService: PrismaService;

  async findOrCreate(uuid = null) {
    let user;

    if (uuid) {
      user = await this.prismaService.user.findFirst({
        where: {
          uuid,
        },
      });
    }

    if (!user) {
      return await this.prismaService.user.create({
        data: {
          uuid,
        },
      });
    }

    return user;
  }
}
