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

  // Apply global validation pipe for request payload validation
  app.useGlobalPipes(new ValidationPipe());

  // Create Swagger document configuration
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

  // Generate Swagger document from the app and configuration
  const document = SwaggerModule.createDocument(app, config);

  // Set up Swagger UI endpoint
  SwaggerModule.setup('api', app, document);

  // Start the application and listen on port 3000
  await app.listen(process.env.PORT || 3002);
}

// Bootstrap the application
bootstrap();
