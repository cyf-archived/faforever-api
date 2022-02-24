import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController, UserController],
  providers: [AppService, UserService, PrismaService],
})
export class AppModule {}
