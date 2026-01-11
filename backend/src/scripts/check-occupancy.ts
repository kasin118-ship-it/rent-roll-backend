
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
    // Use CreateContext instead of Create to avoid listening on ports
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const dataSource = app.get(DataSource);

    console.log('\n==================================================');
    console.log('            RAW DATABASE OCCUPANCY REPORT         ');
    console.log('==================================================');

    try {
        // 1. Get Buildings
        const buildings = await dataSource.query(`
          SELECT id, name, code, rentable_area 
          FROM buildings 
          ORDER BY name
      `);

        if (!buildings.length) {
            console.log('No buildings found.');
        }

        // 2. Get Occupied Area (Active Contracts Only)
        // Using CURRENT_DATE checks
        const occupancy = await dataSource.query(`
          SELECT 
              cu.building_id, 
              SUM(cu.area_sqm) as occupied_area
          FROM contract_units cu
          JOIN rent_contracts c ON cu.contract_id = c.id
          WHERE c.status = 'active'
            AND (c.start_date <= CURDATE() OR c.start_date IS NULL)
            AND (c.end_date >= CURDATE() OR c.end_date IS NULL)
          GROUP BY cu.building_id
      `);

        const occupancyMap = new Map();
        occupancy.forEach((row: any) => {
            occupancyMap.set(row.building_id, parseFloat(row.occupied_area) || 0);
        });

        let grandTotalRentable = 0;
        let grandTotalOccupied = 0;

        buildings.forEach((b: any) => {
            const rentable = parseFloat(b.rentable_area) || 0;
            const occupied = occupancyMap.get(b.id) || 0;
            const percent = rentable > 0 ? (occupied / rentable * 100) : 0;

            grandTotalRentable += rentable;
            grandTotalOccupied += occupied;

            console.log(`
[${b.name}]
  > Code: ${b.code}
  > Rentable Area : ${rentable.toLocaleString('en-US', { minimumFractionDigits: 2 })} sqm
  > Occupied Area : ${occupied.toLocaleString('en-US', { minimumFractionDigits: 2 })} sqm
  > Occupancy Rate: ${percent.toFixed(2)}%
          `);

            if (occupied > rentable) {
                console.log('  WARNING: OVER-OCCUPIED! (Data inconsistency or double-booking)');
            } else if (occupied === rentable) {
                console.log('  STATUS: FULLY BOOKED');
            }
        });

        const grandPercent = grandTotalRentable > 0 ? (grandTotalOccupied / grandTotalRentable * 100) : 0;
        console.log('--------------------------------------------------');
        console.log('GRAND TOTALS:');
        console.log(`  Rentable : ${grandTotalRentable.toLocaleString('en-US', { minimumFractionDigits: 2 })} sqm`);
        console.log(`  Occupied : ${grandTotalOccupied.toLocaleString('en-US', { minimumFractionDigits: 2 })} sqm`);
        console.log(`  Rate     : ${grandPercent.toFixed(2)}%`);
        console.log('==================================================\n');

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await app.close();
        process.exit(0);
    }
}

bootstrap();
