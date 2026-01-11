import { IsString, IsEmail, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { CustomerType } from '../customer.entity';

export class CreateCustomerDto {
    @IsEnum(CustomerType)
    type: CustomerType;

    @IsString()
    @MaxLength(255)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    taxId?: string;

    @IsString()
    @IsOptional()
    addressNo?: string;

    @IsString()
    @IsOptional()
    street?: string;

    @IsString()
    @IsOptional()
    subDistrict?: string;

    @IsString()
    @IsOptional()
    district?: string;

    @IsString()
    @IsOptional()
    province?: string;

    @IsString()
    @IsOptional()
    postalCode?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    contactPerson?: string;
}
