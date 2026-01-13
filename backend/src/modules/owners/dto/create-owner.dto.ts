import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsEmail,
} from 'class-validator';

export class CreateOwnerDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  taxId?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  addressNo?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  street?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  subDistrict?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  district?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  province?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  postalCode?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  contactPerson?: string;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';
}
