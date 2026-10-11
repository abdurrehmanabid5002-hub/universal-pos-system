import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (
        !requestOrigin ||
        requestOrigin.includes('localhost') ||
        requestOrigin.includes('127.0.0.1') ||
        (process.env.WEB_ORIGIN && requestOrigin === process.env.WEB_ORIGIN)
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  app.useGlobalFilters(new GlobalHttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Universal POS API')
    .setDescription(
      'Commercial SaaS Multi-Tenant Point of Sale Platform API Specification. Fully compliant with versioned endpoints under /api/v1.'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('pos_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Universal POS API is running on http://localhost:${port}`);
  logger.log(`OpenAPI documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
