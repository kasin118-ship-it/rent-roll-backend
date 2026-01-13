import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './building.entity';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { CompaniesModule } from '../companies/companies.module';
import { ContractUnit } from '../contracts/contract-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Building, ContractUnit]),
    CompaniesModule,
  ],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
