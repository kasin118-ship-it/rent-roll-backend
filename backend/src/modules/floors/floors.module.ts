import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Floor } from './floor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Floor])],
  controllers: [],
  providers: [],
  exports: [],
})
export class FloorsModule {}
