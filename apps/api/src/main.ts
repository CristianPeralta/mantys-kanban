import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  // Create the Nest application
  const app = await NestFactory.create(AppModule);

  // Apply global validation pipe for request payload validation
  app.useGlobalPipes(new ValidationPipe());

  // Create Swagger document configuration
  const config = new DocumentBuilder()
    .setTitle('Tasks API')
    .setDescription('API for managing tasks')
    .setVersion('1.0')
    .addTag('Tasks')
    .build();

  // Generate Swagger document from the app and configuration
  const document = SwaggerModule.createDocument(app, config);

  // Set up Swagger UI endpoint
  SwaggerModule.setup('api', app, document);

  // Start the application and listen on port 3000
  await app.listen(process.env.PORT || 3000);
}

// Bootstrap the application
bootstrap();
