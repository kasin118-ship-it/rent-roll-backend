import {
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class RentPeriodDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  rentAmount: number;
}

class CreateRentalSpaceDto {
  @IsUUID()
  buildingId: string;

  @IsString()
  floor: string;

  @IsNumber()
  @Min(0)
  areaSqm: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RentPeriodDto)
  rentPeriods: RentPeriodDto[];
}

export class CreateContractDto {
  @IsUUID()
  customerId: string;

  @IsString()
  contractNo: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  depositAmount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRentalSpaceDto)
  rentalSpaces: CreateRentalSpaceDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
