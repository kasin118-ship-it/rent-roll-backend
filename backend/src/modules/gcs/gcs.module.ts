import { Module, Global } from '@nestjs/common';
import { GcsService } from './gcs.service';
import { ConfigModule } from '@nestjs/config';

@Global() // Make GcsService available everywhere
@Module({
  imports: [ConfigModule],
  providers: [GcsService],
  exports: [GcsService],
})
export class GcsModule {}
