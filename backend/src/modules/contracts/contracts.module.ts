import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { RentContract } from './rent-contract.entity';
import { ContractUnit } from './contract-unit.entity';
import { RentPeriod } from './rent-period.entity';
import { ContractDocument } from './contract-document.entity';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            RentContract,
            ContractUnit,
            RentPeriod,
            ContractDocument,
        ]),
        CompaniesModule,
    ],
    controllers: [ContractsController],
    providers: [ContractsService],
    exports: [ContractsService],
})
export class ContractsModule { }
