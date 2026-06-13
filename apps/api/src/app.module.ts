import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Global application configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.test'],
    }),
    // Prisma / PostgreSQL
    PrismaModule,
    // Tasks module
    TasksModule,
  ],
})
export class AppModule {}
