import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  // Create the Nest application
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Apply global validation pipe for request payload validation.
  // whitelist/forbidNonWhitelisted: contención post-pentest 2026-09-02 -- ya lo
  // exigen los e2e (test/*.e2e-spec.ts), esto alinea produccion con lo testeado.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI expone el schema completo sin auth -- nunca en produccion.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MANTYS Kanban API')
      .setDescription('Kanban task-management API: auth, users, projects and tasks.')
      .setVersion('1.0')
      .addTag('Auth')
      .addTag('Projects')
      .addTag('Users')
      .addTag('Tasks')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Start the application and listen on port 3000
  await app.listen(process.env.PORT ?? 3000);
}

// Bootstrap the application
bootstrap();
