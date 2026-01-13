import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OwnersService } from './owners.service';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CompaniesService } from '../companies/companies.service';

@Controller('owners')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OwnersController {
  constructor(
    private readonly ownersService: OwnersService,
    private readonly companiesService: CompaniesService,
  ) {}

  // Helper for dev mode
  private async getCompanyId(user: any): Promise<string> {
    if (user?.companyId) return user.companyId;
    const company = await this.companiesService.getCompanyProfile();
    return company?.id || '';
  }

  @Post()
  @Roles('admin', 'staff')
  async create(@Body() createDto: CreateOwnerDto, @CurrentUser() user: any) {
    const companyId = await this.getCompanyId(user);
    return this.ownersService.create(createDto, companyId);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    const companyId = await this.getCompanyId(user);
    return this.ownersService.findAll(companyId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const companyId = await this.getCompanyId(user);
    return this.ownersService.findOne(id, companyId);
  }

  @Put(':id')
  @Roles('admin', 'staff')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOwnerDto,
    @CurrentUser() user: any,
  ) {
    const companyId = await this.getCompanyId(user);
    return this.ownersService.update(id, updateDto, companyId);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const companyId = await this.getCompanyId(user);
    return this.ownersService.remove(id, companyId);
  }
}
