import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('client.query')) return;
  console.warn(warning);
});
async function bootstrap() {
  const app = await NestFactory.create(AppModule,
    {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    },
  );
const logger = new Logger('HTTP');

  app.use((req: any, res: any, next: any) => {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      const color =
        statusCode >= 500 ? '🔴' :
        statusCode >= 400 ? '🟡' :
        statusCode >= 300 ? '🔵' :
        '🟢';

      logger.log(
        `${color} ${method} ${originalUrl} → ${statusCode} (${duration}ms)`
      );
    });

    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`App running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();