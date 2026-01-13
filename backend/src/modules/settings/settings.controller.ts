import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('export-data')
  // @UseGuards(JwtAuthGuard)
  async getExportData(@Request() req: any) {
    // Mocking company ID for now, or extract from user if Auth works
    const companyId = req?.user?.companyId || 'company-id-placeholder';
    // Note: For now we'll fetch FIRST company if auth not fully wired in seed/demo
    // Or actually, in this request we don't have companyId easily if not auth.
    // Let's assume there's one company.
    return this.settingsService.getExportData('1'); // Use ID 1 or fetch dynamically
  }

  @Post('import-data')
  async importData(@Body() body: any) {
    // body should be { customers: [], buildings: [], ... }
    return this.settingsService.importData('1', body); // Hardcoded company ID 1 for simplicity of task
  }
}
