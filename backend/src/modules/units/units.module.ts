import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from './unit.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Unit])],
    controllers: [],
    providers: [],
    exports: [],
})
export class UnitsModule { }
