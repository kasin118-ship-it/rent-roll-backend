
import { Controller, Get, Post, Res, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { BackupService } from './backup.service';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('backup')
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    @Get('download')
    async downloadBackup(@Res() res: Response) {
        return this.backupService.createBackup(res);
    }

    @Post('restore')
    async restoreBackup(@Body() body: any) {
        return this.backupService.restoreBackup(body);
    }
}
