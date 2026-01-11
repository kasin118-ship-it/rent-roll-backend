import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { ContractUnit } from '../contracts/contract-unit.entity';
import { ContractStatus } from '../contracts/rent-contract.entity';

@Injectable()
export class BuildingsService {
    constructor(
        @InjectRepository(Building)
        private readonly buildingRepository: Repository<Building>,
        @InjectRepository(ContractUnit)
        private readonly contractUnitRepository: Repository<ContractUnit>,
    ) { }

    async create(createDto: CreateBuildingDto, companyId: string): Promise<Building> {
        // Check code uniqueness within company
        const existing = await this.buildingRepository.findOne({
            where: { companyId, code: createDto.code },
        });
        if (existing) {
            throw new ConflictException('Building code already exists in this company');
        }

        const building = this.buildingRepository.create({
            ...createDto,
            companyId,
        });

        return this.buildingRepository.save(building);
    }

    async findAll(companyId: string): Promise<any[]> {
        const buildings = await this.buildingRepository.find({
            where: { companyId },
            relations: ['floors'],
            order: { name: 'ASC' },
        });

        // Get rented area per building from active contracts
        const rentedAreaByBuilding = await this.contractUnitRepository
            .createQueryBuilder('cu')
            .select('cu.building_id', 'buildingId')
            .addSelect('SUM(cu.area_sqm)', 'rentedArea')
            .innerJoin('cu.contract', 'c')
            .where('c.status = :status', { status: ContractStatus.ACTIVE })
            .andWhere('c.start_date <= :now', { now: new Date() })
            .andWhere('c.end_date >= :now', { now: new Date() })
            .andWhere('cu.building_id IS NOT NULL')
            .groupBy('cu.building_id')
            .getRawMany();

        const rentedAreaMap = new Map<string, number>();
        rentedAreaByBuilding.forEach(row => {
            rentedAreaMap.set(row.buildingId, parseFloat(row.rentedArea) || 0);
        });

        console.log('--- OCCUPANCY DATA DEBUG ---');
        console.log('Rented Areas by Building ID:', Object.fromEntries(rentedAreaMap));
        buildings.forEach(b => {
            console.log(`Building: ${b.name}, ID: ${b.id}, Total Area: ${b.rentableArea}, Rented: ${rentedAreaMap.get(b.id) || 0}`);
        });
        console.log('----------------------------');

        // Add occupancy data to each building
        return buildings.map(b => {
            const totalArea = Number(b.rentableArea) || 0;
            // Cap rented area at total area to prevent >100% stats
            let rentedArea = rentedAreaMap.get(b.id) || 0;
            if (rentedArea > totalArea) rentedArea = totalArea;

            const occupancyRate = totalArea > 0 ? Math.round((rentedArea / totalArea) * 100) : 0;

            return {
                ...b,
                rentedArea,
                occupancyRate,
            };
        });
    }

    async findOne(id: string, companyId: string): Promise<Building> {
        const building = await this.buildingRepository.findOne({
            where: { id, companyId },
            relations: ['floors'],
        });
        if (!building) {
            throw new NotFoundException('Building not found');
        }
        return building;
    }

    async update(id: string, updateDto: UpdateBuildingDto, companyId: string): Promise<Building> {
        const building = await this.findOne(id, companyId);
        Object.assign(building, updateDto);
        return this.buildingRepository.save(building);
    }

    async remove(id: string, companyId: string): Promise<void> {
        const building = await this.findOne(id, companyId);
        await this.buildingRepository.softRemove(building);
    }

    async getOccupancyStats(companyId: string): Promise<{
        totalBuildings: number;
        totalArea: number;
        rentedArea: number;
        occupancyRate: number;
    }> {
        const buildings = await this.findAll(companyId);
        const totalBuildings = buildings.length;
        let totalArea = 0;
        let rentedArea = 0;

        buildings.forEach(b => {
            totalArea += Number(b.rentableArea) || 0;
            rentedArea += b.rentedArea || 0;
        });

        return {
            totalBuildings,
            totalArea,
            rentedArea,
            occupancyRate: totalArea > 0 ? Math.round((rentedArea / totalArea) * 100) : 0,
        };
    }

    async getStatsByBuilding(companyId: string): Promise<{
        buildings: {
            id: string;
            name: string;
            code: string;
            totalFloors: number;
            totalArea: number;
            rentedArea: number;
            occupancyRate: number;
        }[];
    }> {
        const buildings = await this.findAll(companyId);

        const buildingStats = buildings.map(b => ({
            id: b.id,
            name: b.name,
            code: b.code,
            totalFloors: b.totalFloors,
            totalArea: Number(b.rentableArea) || 0,
            rentedArea: b.rentedArea || 0,
            occupancyRate: b.occupancyRate || 0,
        }));

        return { buildings: buildingStats };
    }
}

