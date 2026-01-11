
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../modules/seed/seed.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const seedService = app.get(SeedService);

    console.log('Resetting Database...');
    await seedService.resetData();

    console.log('Seeding new data...');
    await seedService.seed();

    await app.close();
}
bootstrap();
