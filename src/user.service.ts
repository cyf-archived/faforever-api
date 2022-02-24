import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class UserService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  async findOrCreate(uuid = null) {
    const prisma = new PrismaClient();
    let user;

    if (uuid) {
      user = await prisma.user.findFirst({
        where: {
          uuid,
        },
      });
    }

    if (!user) {
      return await prisma.user.create({
        data: {
          uuid,
        },
      });
    }

    return user;
  }
}
