import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ContractStatus } from './rent-contract.entity';
import { CompaniesService } from '../companies/companies.service';

@Controller('contracts')
// @UseGuards(AuthGuard('jwt'), RolesGuard) // TODO: Re-enable for production
export class ContractsController {
    constructor(
        private readonly contractsService: ContractsService,
        private readonly companiesService: CompaniesService,
    ) { }

    @Post()
    @Roles('admin', 'staff')
    @UseInterceptors(FilesInterceptor('documents'))
    async create(
        @Body('data') data: string,
        @UploadedFiles() files: Express.Multer.File[],
        @CurrentUser() user: any,
    ) {
        const createDto: CreateContractDto = JSON.parse(data);
        return this.contractsService.create(createDto, user.id, user.companyId, files);
    }

    @Get()
    async findAll(
        @CurrentUser() user: any,
        @Query('status') status?: ContractStatus,
        @Query('customerId') customerId?: string,
        @Query('buildingId') buildingId?: string,
    ) {
        // Dev fallback: use first company if no auth
        let companyId = user?.companyId;
        if (!companyId) {
            const firstCompany = await this.companiesService.getCompanyProfile();
            companyId = firstCompany?.id;
        }
        return this.contractsService.findAll(companyId, { status, customerId, buildingId });
    }

    @Get('expiring')
    async getExpiring(@CurrentUser() user: any, @Query('days') days?: number) {
        let companyId = user?.companyId;
        if (!companyId) {
            const firstCompany = await this.companiesService.getCompanyProfile();
            companyId = firstCompany?.id;
        }
        return this.contractsService.getExpiringContracts(companyId, days || 30);
    }

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        let companyId = user?.companyId;
        if (!companyId) {
            const firstCompany = await this.companiesService.getCompanyProfile();
            companyId = firstCompany?.id;
        }
        return this.contractsService.findOne(id, companyId);
    }

    @Post(':id/activate')
    @Roles('admin', 'staff')
    async activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.contractsService.activate(id, user.companyId);
    }

    @Post(':id/terminate')
    @Roles('admin', 'staff')
    async terminate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.contractsService.terminate(id, user.companyId);
    }
}
