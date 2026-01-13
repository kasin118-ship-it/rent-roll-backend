import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('admin')
  async findAll(
    @CurrentUser() user: any,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll(user.companyId, {
      action,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.auditService.findOne(id, user.companyId);
  }
}
