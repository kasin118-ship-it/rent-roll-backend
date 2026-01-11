
import { Injectable, Logger, StreamableFile } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Response } from 'express';

@Injectable()
export class BackupService {
    private readonly logger = new Logger(BackupService.name);

    constructor(private readonly dataSource: DataSource) { }

    async createBackup(res: Response) {
        this.logger.log('Starting system backup...');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            // Fetch all data from key tables
            // We select explicit tables to avoid backing up system tables or migrations if not needed
            // Also helps filtering out removed tables like 'units'
            const tables = [
                'companies',
                'users',
                'roles',
                'buildings',
                'floors',
                'customers',
                'rent_contracts',
                'contract_units',
                'rent_periods',
                'contract_documents'
            ];

            const backupData: Record<string, any[]> = {};

            for (const table of tables) {
                // Check if table exists first
                const tableExists = await queryRunner.hasTable(table);
                if (tableExists) {
                    const data = await queryRunner.query(`SELECT * FROM ${table}`);
                    backupData[table] = data;
                }
            }

            const backupJson = JSON.stringify({
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: backupData
            }, null, 2);

            res.set({
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="rent_roll_backup_${new Date().toISOString().split('T')[0]}.json"`,
            });

            res.send(backupJson);

            this.logger.log('Backup completed successfully');
        } catch (error) {
            this.logger.error('Backup failed', error);
            res.status(500).json({ message: 'Backup failed', error: error.message });
        } finally {
            await queryRunner.release();
        }
    }

    async restoreBackup(backupData: any) {
        this.logger.log('Starting system restore...');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Disable Foreign Key Checks
            await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

            const tables = [
                'contract_documents',
                'rent_periods',
                'contract_units',
                'rent_contracts',
                'customers',
                'floors',
                'buildings',
                'roles',
                'users',
                'companies'
            ];

            // 1. Clear existing data
            for (const table of tables) {
                const tableExists = await queryRunner.hasTable(table);
                if (tableExists) {
                    await queryRunner.query(`TRUNCATE TABLE ${table}`);
                }
            }

            // 2. Insert new data
            // We need to be careful with column mapping. 
            // Assuming backup matches schema 1:1. 
            // If schema changed (e.g. units table removed), the backup JSON won't have it, 
            // or if we restore an OLD backup WITH units, we just ignore the 'units' key in JSON.

            const data = backupData.data || {};

            for (const table of Object.keys(data)) {
                // Skip if table no longer exists (e.g. 'units')
                if (table === 'units') continue;
                if (!await queryRunner.hasTable(table)) continue;

                const rows = data[table];
                if (rows.length === 0) continue;

                // Create INSERT statement dynamically
                // We use first row to get keys
                const keys = Object.keys(rows[0]);
                const escapedKeys = keys.map(k => `\`${k}\``).join(',');

                // Batch insert
                // Note: TypeORM doesn't support raw huge inserts easily without entity, 
                // but we can loop or chunk. For robustness with raw data, chunking 100 is safe.
                const chunkSize = 100;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);
                    const valuesStr = chunk.map((row: any) => {
                        const vals = keys.map(k => {
                            const val = row[k];
                            if (val === null) return 'NULL';
                            if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`; // escaped quotes
                            if (val instanceof Date) return `"${val.toISOString().slice(0, 19).replace('T', ' ')}"`;
                            return val;
                        });
                        return `(${vals.join(',')})`;
                    }).join(',');

                    await queryRunner.query(`INSERT INTO ${table} (${escapedKeys}) VALUES ${valuesStr}`);
                }
            }

            await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
            await queryRunner.commitTransaction();
            this.logger.log('Restore completed successfully');
            return { success: true, message: 'System restored successfully' };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Restore failed', error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
