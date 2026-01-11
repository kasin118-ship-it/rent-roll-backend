import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import * as ExcelJS from 'exceljs';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('revenue')
    async getRevenueReport(
        @CurrentUser() user: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const today = new Date();
        const start = startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const end = endDate || today.toISOString().split('T')[0];
        return this.reportsService.getRevenueReport(user.companyId, start, end);
    }

    @Get('occupancy')
    async getOccupancyReport(
        @CurrentUser() user: any,
        @Query('endDate') endDate?: string,
    ) {
        return this.reportsService.getOccupancyReport(user.companyId, endDate);
    }

    @Get('expiring')
    async getExpiringContracts(
        @CurrentUser() user: any,
        @Query('days') days?: number,
    ) {
        return this.reportsService.getExpiringContractsReport(user.companyId, days || 90);
    }

    @Get('revenue/export')
    async exportRevenueReport(
        @CurrentUser() user: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Res() res: Response,
    ) {
        const data = await this.reportsService.getRevenueReport(user.companyId, startDate, endDate);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Revenue Report');

        // Header
        sheet.addRow(['Revenue Report']);
        sheet.addRow([`Period: ${startDate} to ${endDate}`]);
        sheet.addRow([]);

        // Summary
        sheet.addRow(['Summary']);
        sheet.addRow(['Total Revenue', data.totalRevenue]);
        sheet.addRow(['Active Contracts', data.activeContractCount]);
        sheet.addRow(['Average Rent', data.averageRent]);
        sheet.addRow([]);

        // By Building
        sheet.addRow(['Revenue by Building']);
        sheet.addRow(['Building', 'Total Rent', 'Contracts']);
        data.revenueByBuilding.forEach(b => {
            sheet.addRow([b.buildingName, b.totalRent, b.contractCount]);
        });
        sheet.addRow([]);

        // Top Customers
        sheet.addRow(['Top Customers']);
        sheet.addRow(['Customer', 'Total Rent', 'Contracts']);
        data.topCustomers.forEach(c => {
            sheet.addRow([c.customerName, c.totalRent, c.contractCount]);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=revenue_report.xlsx');
        res.send(buffer);
    }
}
