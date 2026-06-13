import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Global application configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.test'],
    }),
    // Prisma / PostgreSQL (Slice 1 — additive, MongoDB removed in Slice 2)
    PrismaModule,
    // MongoDB configuration and connection (removed in Slice 2)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGODB_CONNECTION_STRING'),
      }),
      inject: [ConfigService],
    }),
    // Tasks module
    TasksModule,
  ],
})
export class AppModule {}
