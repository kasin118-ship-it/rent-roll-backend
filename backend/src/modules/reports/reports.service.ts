import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface RevenueReport {
    totalRevenue: number;
    activeContractCount: number;
    averageRent: number;
    revenueByBuilding: Array<{
        buildingId: string;
        buildingName: string;
        totalRent: number;
        contractCount: number;
    }>;
    monthlyTrend: Array<{
        month: string;
        revenue: number;
    }>;
    topCustomers: Array<{
        customerId: string;
        customerName: string;
        totalRent: number;
        contractCount: number;
    }>;
}

@Injectable()
export class ReportsService {
    constructor(private readonly dataSource: DataSource) { }

    async getRevenueReport(
        companyId: string,
        startDate: string,
        endDate: string,
    ): Promise<RevenueReport> {
        // Total Revenue and Contract Count
        const summaryResult = await this.dataSource.query(
            `SELECT 
        COALESCE(SUM(rp.rent_amount), 0) as totalRevenue,
        COUNT(DISTINCT rc.id) as activeContractCount
      FROM rent_contracts rc
      LEFT JOIN rent_periods rp ON rp.contract_id = rc.id
      WHERE rc.company_id = ?
        AND rc.status = 'active'
        AND rc.deleted_at IS NULL
        AND (rp.start_date <= ? AND rp.end_date >= ?)`,
            [companyId, endDate, startDate],
        );

        const totalRevenue = parseFloat(summaryResult[0]?.totalRevenue) || 0;
        const activeContractCount = parseInt(summaryResult[0]?.activeContractCount) || 0;
        const averageRent = activeContractCount > 0 ? totalRevenue / activeContractCount : 0;

        // Revenue by Building
        const revenueByBuilding = await this.dataSource.query(
            `SELECT 
        b.id as buildingId,
        b.name as buildingName,
        COALESCE(SUM(rp.rent_amount), 0) as totalRent,
        COUNT(DISTINCT rc.id) as contractCount
      FROM buildings b
      LEFT JOIN units u ON u.building_id = b.id
      LEFT JOIN contract_units cu ON cu.unit_id = u.id
      LEFT JOIN rent_contracts rc ON cu.contract_id = rc.id AND rc.status = 'active'
      LEFT JOIN rent_periods rp ON rp.contract_id = rc.id
      WHERE b.company_id = ?
        AND b.deleted_at IS NULL
      GROUP BY b.id
      ORDER BY totalRent DESC`,
            [companyId],
        );

        // Monthly Trend (Last 12 months)
        const monthlyTrend = await this.dataSource.query(
            `SELECT 
        DATE_FORMAT(rp.start_date, '%Y-%m') as month,
        SUM(rp.rent_amount) as revenue
      FROM rent_periods rp
      INNER JOIN rent_contracts rc ON rp.contract_id = rc.id
      WHERE rc.company_id = ?
        AND rc.deleted_at IS NULL
        AND rp.start_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month`,
            [companyId],
        );

        // Top Customers
        const topCustomers = await this.dataSource.query(
            `SELECT 
        c.id as customerId,
        c.name as customerName,
        COALESCE(SUM(rp.rent_amount), 0) as totalRent,
        COUNT(DISTINCT rc.id) as contractCount
      FROM customers c
      INNER JOIN rent_contracts rc ON rc.customer_id = c.id
      LEFT JOIN rent_periods rp ON rp.contract_id = rc.id
      WHERE c.company_id = ?
        AND rc.status = 'active'
        AND rc.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY totalRent DESC
      LIMIT 10`,
            [companyId],
        );

        return {
            totalRevenue,
            activeContractCount,
            averageRent,
            revenueByBuilding,
            monthlyTrend,
            topCustomers,
        };
    }

    async getOccupancyReport(companyId: string): Promise<{
        totalUnits: number;
        occupiedUnits: number;
        vacantUnits: number;
        maintenanceUnits: number;
        occupancyRate: number;
        byBuilding: Array<{
            buildingId: string;
            buildingName: string;
            total: number;
            occupied: number;
            vacant: number;
            occupancyRate: number;
        }>;
    }> {
        const result = await this.dataSource.query(
            `SELECT 
        b.id as buildingId,
        b.name as buildingName,
        COUNT(u.id) as total,
        SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN u.status = 'vacant' THEN 1 ELSE 0 END) as vacant,
        SUM(CASE WHEN u.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM buildings b
      LEFT JOIN units u ON u.building_id = b.id AND u.deleted_at IS NULL
      WHERE b.company_id = ?
        AND b.deleted_at IS NULL
      GROUP BY b.id`,
            [companyId],
        );

        let totalUnits = 0;
        let occupiedUnits = 0;
        let vacantUnits = 0;
        let maintenanceUnits = 0;

        const byBuilding = result.map((row: any) => {
            const total = parseInt(row.total) || 0;
            const occupied = parseInt(row.occupied) || 0;
            const vacant = parseInt(row.vacant) || 0;
            const maintenance = parseInt(row.maintenance) || 0;

            totalUnits += total;
            occupiedUnits += occupied;
            vacantUnits += vacant;
            maintenanceUnits += maintenance;

            return {
                buildingId: row.buildingId,
                buildingName: row.buildingName,
                total,
                occupied,
                vacant,
                occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
            };
        });

        return {
            totalUnits,
            occupiedUnits,
            vacantUnits,
            maintenanceUnits,
            occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
            byBuilding,
        };
    }

    async getExpiringContractsReport(companyId: string, days: number): Promise<any[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        return this.dataSource.query(
            `SELECT 
        rc.id,
        rc.contract_no as contractNo,
        rc.start_date as startDate,
        rc.end_date as endDate,
        c.name as customerName,
        c.phone as customerPhone,
        GROUP_CONCAT(CONCAT(b.name, ' - ', u.unit_no) SEPARATOR ', ') as units,
        SUM(rp.rent_amount) as totalRent
      FROM rent_contracts rc
      INNER JOIN customers c ON c.id = rc.customer_id
      LEFT JOIN contract_units cu ON cu.contract_id = rc.id
      LEFT JOIN units u ON u.id = cu.unit_id
      LEFT JOIN buildings b ON b.id = u.building_id
      LEFT JOIN rent_periods rp ON rp.contract_id = rc.id
      WHERE rc.company_id = ?
        AND rc.status = 'active'
        AND rc.deleted_at IS NULL
        AND rc.end_date <= ?
        AND rc.end_date >= NOW()
      GROUP BY rc.id
      ORDER BY rc.end_date ASC`,
            [companyId, futureDate.toISOString().split('T')[0]],
        );
    }
}
