import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlertsService } from './alerts.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';

@Controller('alerts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('unread') unread?: string) {
    return this.alertsService.findAll(user.companyId, unread === 'true');
  }

  @Get('count')
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.alertsService.getUnreadCount(user.companyId);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.alertsService.markAsRead(id, user.companyId);
    return { success: true };
  }

  @Put('read-all')
  async markAllAsRead(@CurrentUser() user: any) {
    await this.alertsService.markAllAsRead(user.companyId);
    return { success: true };
  }
}
