import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { Building } from '../buildings/building.entity';
import { Customer } from '../customers/customer.entity';
import { RentContract } from '../contracts/rent-contract.entity';
import { ContractUnit } from '../contracts/contract-unit.entity';
import { RentPeriod } from '../contracts/rent-period.entity';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { Role } from '../users/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Building,
      Customer,
      RentContract,
      ContractUnit,
      RentPeriod,
      Company,
      User,
      Role,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
