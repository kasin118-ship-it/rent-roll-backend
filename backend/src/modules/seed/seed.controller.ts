import { Controller, Post, Get } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
    constructor(private readonly seedService: SeedService) { }

    @Post()
    async seed() {
        return this.seedService.seed();
    }

    @Post('admin')
    async seedAdmin() {
        return this.seedService.seedAdminOnly();
    }

    @Post('buildings')
    async seedBuildings() {
        return this.seedService.seedBuildings();
    }

    @Post('customers')
    async seedCustomers() {
        return this.seedService.seedCustomers();
    }

    @Post('contracts')
    async seedContracts() {
        return this.seedService.seedContracts();
    }

    @Post('reset')
    async reset() {
        return this.seedService.resetData();
    }
}
