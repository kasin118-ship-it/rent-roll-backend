import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CompaniesService } from '../companies/companies.service';

@Controller('buildings')
// @UseGuards(AuthGuard('jwt'), RolesGuard) // TODO: Re-enable for production
export class BuildingsController {
    constructor(
        private readonly buildingsService: BuildingsService,
        private readonly companiesService: CompaniesService,
    ) { }

    // Helper for dev mode
    private async getCompanyId(user: any): Promise<string> {
        if (user?.companyId) return user.companyId;
        const company = await this.companiesService.getCompanyProfile();
        return company?.id || '';
    }

    @Post()
    @Roles('admin', 'staff')
    async create(@Body() createDto: CreateBuildingDto, @CurrentUser() user: any) {
        const companyId = await this.getCompanyId(user);
        return this.buildingsService.create(createDto, companyId);
    }

    @Get()
    async findAll(@CurrentUser() user: any) {
        const companyId = await this.getCompanyId(user);
        return this.buildingsService.findAll(companyId);
    }

    @Get('stats')
    async getStats(@CurrentUser() user: any) {
        const companyId = await this.getCompanyId(user);
        return this.buildingsService.getOccupancyStats(companyId);
    }

    @Get('stats/by-building')
    async getStatsByBuilding(@CurrentUser() user: any) {
        const companyId = await this.getCompanyId(user);
        return this.buildingsService.getStatsByBuilding(companyId);
    }

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        const companyId = await this.getCompanyId(user);
        return this.buildingsService.findOne(id, companyId);
    }

    @Put(':id')
    @Roles('admin', 'staff')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateBuildingDto,
        @CurrentUser() user: any,
    ) {
        const companyId = await this.getCompanyId(user);
        return this.buildingsService.update(id, updateDto, companyId);
    }

    @Delete(':id')
    @Roles('admin')
    async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        const companyId = await this.getCompanyId(user);
        return this.buildingsService.remove(id, companyId);
    }
}
