import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('HYDRAA Budget, Treasury & Expenditure Management System API')
    .setDescription('Official Backend REST APIs for HYDRAA Treasury Officers, Govt of Telangana')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`================================================================`);
  console.log(`HYDRAA Treasury Backend Server is running on: http://localhost:${port}`);
  console.log(`Network Access: http://192.168.0.210:${port} or http://0.0.0.0:${port}`);
  console.log(`Swagger OpenAPI Documentation: http://localhost:${port}/api/docs`);
  console.log(`================================================================`);
}
bootstrap();

