import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';

@Controller('customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    @Roles('admin', 'staff')
    async create(@Body() createDto: any, @CurrentUser() user: any) {
        return this.customersService.create(createDto, user.companyId);
    }

    @Get()
    async findAll(@CurrentUser() user: any) {
        return this.customersService.findAll(user.companyId);
    }

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.customersService.findOne(id, user.companyId);
    }

    @Put(':id')
    @Roles('admin', 'staff')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: any,
        @CurrentUser() user: any,
    ) {
        return this.customersService.update(id, updateDto, user.companyId);
    }

    @Delete(':id')
    @Roles('admin')
    async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
        return this.customersService.remove(id, user.companyId);
    }
}
