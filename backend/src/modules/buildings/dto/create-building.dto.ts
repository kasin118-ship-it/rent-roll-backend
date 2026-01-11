import { IsString, IsNumber, IsOptional, IsEnum, Min, MaxLength } from 'class-validator';

export class CreateBuildingDto {
    @IsString()
    @MaxLength(255)
    name: string;

    @IsString()
    @MaxLength(50)
    code: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsNumber()
    @Min(1)
    @IsOptional()
    totalFloors?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    rentableArea?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    constructionArea?: number;

    @IsEnum(['active', 'inactive'])
    @IsOptional()
    status?: 'active' | 'inactive';
}
