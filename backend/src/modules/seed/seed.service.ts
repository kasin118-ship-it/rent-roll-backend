import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Building } from '../buildings/building.entity';
import { Customer } from '../customers/customer.entity';
import { RentContract } from '../contracts/rent-contract.entity';
import { ContractUnit } from '../contracts/contract-unit.entity';
import { RentPeriod } from '../contracts/rent-period.entity';
import { faker } from '@faker-js/faker';
import { Company } from '../companies/company.entity';
import { Role } from '../users/role.entity';
import { User } from '../users/user.entity'; // Import User entity
import * as argon2 from 'argon2'; // Import argon2

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        private dataSource: DataSource,
        @InjectRepository(Company) private companyRepo: Repository<Company>,
        @InjectRepository(Role) private roleRepo: Repository<Role>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) { }

    async seedAdminOnly() {
        this.logger.log("Creating Admin User Only...");

        // 0. Ensure Company Exists
        let company = await this.companyRepo.findOne({ where: {} });
        if (!company) {
            company = this.companyRepo.create({
                name: "Global Lumber Co., Ltd.",
                // code: "GL", // Removed as not in entity
                addressNo: "123",
                street: "Main St",
                subDistrict: "Pathum Wan",
                district: "Pathum Wan",
                province: "Bangkok",
                postalCode: "10330",
                phone: "02-123-4567",
                taxId: "1234567890123"
            });
            company = await this.companyRepo.save(company);
            this.logger.log("Created Default Company");
        }

        // Ensure Admin Role Exists
        let adminRole = await this.roleRepo.findOne({ where: { name: 'admin' } });
        if (!adminRole) {
            adminRole = this.roleRepo.create({ name: 'admin', description: 'Administrator' });
            adminRole = await this.roleRepo.save(adminRole);
            this.logger.log("Created Admin Role");
        }

        // Ensure Admin User Exists
        let adminUser = await this.userRepo.findOne({ where: { email: 'admin@kingbridge.com' } });
        if (!adminUser) {
            const hashedPassword = await argon2.hash('admin123');
            adminUser = this.userRepo.create({
                username: 'admin',
                email: 'admin@kingbridge.com',
                passwordHash: hashedPassword,
                fullName: 'System Administrator',
                isActive: true,
                companyId: company.id,
                roleId: adminRole.id,
            });
            await this.userRepo.save(adminUser);
            this.logger.log("Created Admin User: admin@kingbridge.com / admin123");
        }

        return { success: true, message: 'Admin user created: admin@kingbridge.com / admin123' };
    }

    async seed() {
        this.logger.log("Starting Seed Process...");
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Company
            let company = await queryRunner.manager.findOne(Company, { where: {} });
            if (!company) {
                company = queryRunner.manager.create(Company, {
                    name: "Global Lumber Co., Ltd.",
                    // code: "GL",
                    addressNo: "123",
                    street: "Main St",
                    subDistrict: "Pathum Wan",
                    district: "Pathum Wan",
                    province: "Bangkok",
                    postalCode: "10330",
                    phone: "02-123-4567",
                    taxId: "1234567890123"
                });
                company = await queryRunner.manager.save(company);
            }

            // 2. Roles
            let adminRole = await queryRunner.manager.findOne(Role, { where: { name: 'admin' } });
            if (!adminRole) {
                adminRole = queryRunner.manager.create(Role, { name: 'admin', description: 'Administrator' });
                await queryRunner.manager.save(adminRole);
            }

            // 3. Admin User
            // Need to import argon2 manually if not available in service (usually handled in auth service but doing here for seed)
            // Assuming argon2 is available via import
            let adminUser = await queryRunner.manager.findOne(User, { where: { email: 'admin@kingbridge.com' } });
            if (!adminUser) {
                const hashedPassword = await argon2.hash('admin123');
                adminUser = queryRunner.manager.create(User, {
                    username: 'admin',
                    email: 'admin@kingbridge.com',
                    passwordHash: hashedPassword,
                    fullName: 'System Administrator',
                    isActive: true,
                    companyId: company.id,
                    roleId: adminRole.id, // Assign role
                });
                adminUser = await queryRunner.manager.save(adminUser);
            }


            // 4. Buildings (Create 3 buildings)
            const buildings: Building[] = [];
            for (let i = 0; i < 3; i++) {
                const name = i === 0 ? "Kingbridge Tower" : faker.location.streetAddress();
                const building = queryRunner.manager.create(Building, {
                    companyId: company.id, // Required field
                    name: name,
                    code: `KT-${String.fromCharCode(65 + i)}`,
                    totalFloors: faker.number.int({ min: 10, max: 40 }),
                    rentableArea: faker.number.int({ min: 5000, max: 30000 }),
                });
                buildings.push(await queryRunner.manager.save(building));
            }

            // 5. Customers (Create 100 customers) - FAST INSERT
            this.logger.log('Creating 100 customers...');
            const customerData: Partial<Customer>[] = [];
            for (let i = 0; i < 100; i++) {
                const type = faker.helpers.arrayElement(['corporate', 'individual']);
                const custName = type === 'corporate' ? faker.company.name() : faker.person.fullName();
                customerData.push({
                    companyId: company.id,
                    type: type as any,
                    name: custName,
                    taxId: faker.finance.accountNumber(13),
                    addressNo: faker.location.buildingNumber(),
                    street: faker.location.street(),
                    subDistrict: faker.helpers.arrayElement(['Pathum Wan', 'Khlong Toei', 'Bang Rak', 'Sathon']),
                    district: faker.helpers.arrayElement(['Pathum Wan', 'Khlong Toei', 'Bang Rak', 'Sathon']),
                    province: 'Bangkok',
                    postalCode: faker.helpers.arrayElement(['10110', '10120', '10330', '10500']),
                    phone: faker.string.numeric(10),
                    email: faker.internet.email(),
                    contactPerson: faker.person.fullName(),
                });
            }
            await queryRunner.manager.insert(Customer, customerData);
            const customers = await queryRunner.manager.find(Customer, { where: { companyId: company.id } });
            this.logger.log(`Created ${customers.length} customers`);

            // 6. Contracts - OPTIMIZED BATCH PROCESSING
            // Prepare ALL contracts first, then ALL units, then ALL periods
            this.logger.log('Creating 300 contracts with floors and pricing tiers...');

            // Step 1: Create all contracts in one insert
            const contractData: Partial<RentContract>[] = [];
            const contractMeta: { contractNo: string; building: Building; startDate: Date; endDate: Date }[] = [];

            for (let i = 0; i < 50; i++) {
                const customer = faker.helpers.arrayElement(customers);
                const building = faker.helpers.arrayElement(buildings);
                const startDate = faker.date.between({ from: '2023-01-01', to: '2025-12-31' });
                const endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + faker.number.int({ min: 1, max: 5 }));
                const contractNo = `CNT-${startDate.getFullYear()}-${String(i + 1).padStart(4, '0')}`;

                contractData.push({
                    contractNo,
                    customerId: customer.id,
                    companyId: company.id,
                    status: faker.helpers.arrayElement(['active', 'active', 'active', 'draft', 'expired']) as any,
                    startDate: startDate,
                    endDate: endDate,
                    depositAmount: faker.number.int({ min: 50000, max: 500000 }),
                    createdBy: adminUser.id,
                });
                contractMeta.push({ contractNo, building, startDate, endDate });
            }

            // Single insert for all 300 contracts
            await queryRunner.manager.insert(RentContract, contractData);
            this.logger.log('Inserted 300 contracts, fetching IDs...');

            // Fetch saved contracts by contractNo for ID mapping
            const savedContracts = await queryRunner.manager.find(RentContract, {
                where: { companyId: company.id },
                order: { contractNo: 'ASC' }
            });
            const contractMap = new Map(savedContracts.map(c => [c.contractNo, c]));

            // Step 2: Create all units
            const unitData: Partial<ContractUnit>[] = [];
            const unitMeta: { contractNo: string; unitIdx: number; startDate: Date; endDate: Date; area: number }[] = [];

            for (let i = 0; i < 50; i++) {
                const meta = contractMeta[i];
                const contract = contractMap.get(meta.contractNo);
                if (!contract) continue;

                const numFloors = faker.number.int({ min: 1, max: 3 });
                for (let f = 0; f < numFloors; f++) {
                    const floor = faker.number.int({ min: 1, max: meta.building.totalFloors });
                    const area = faker.number.float({ min: 50, max: 800, fractionDigits: 2 });

                    unitData.push({
                        contractId: contract.id,
                        buildingId: meta.building.id,
                        floor: floor.toString(),
                        areaSqm: area,
                    });
                    unitMeta.push({ contractNo: meta.contractNo, unitIdx: unitData.length - 1, startDate: meta.startDate, endDate: meta.endDate, area });
                }
            }

            // Single insert for all units
            await queryRunner.manager.insert(ContractUnit, unitData);
            this.logger.log(`Inserted ${unitData.length} contract units, fetching IDs...`);

            // Fetch all saved units
            const savedUnits = await queryRunner.manager.find(ContractUnit, {
                where: { contractId: In(savedContracts.map(c => c.id)) },
                order: { createdAt: 'ASC' }
            });

            // Step 3: Create all rent periods
            const periodData: Partial<RentPeriod>[] = [];

            for (let idx = 0; idx < savedUnits.length && idx < unitMeta.length; idx++) {
                const unit = savedUnits[idx];
                const meta = unitMeta[idx];
                const numTiers = faker.number.int({ min: 1, max: 3 });
                const contractDurationMs = meta.endDate.getTime() - meta.startDate.getTime();
                const tierDurationMs = contractDurationMs / numTiers;
                const baseRentPerSqm = faker.number.int({ min: 400, max: 1000 });
                const tierIncrease = faker.number.int({ min: 30, max: 100 });

                for (let t = 0; t < numTiers; t++) {
                    const tierStart = new Date(meta.startDate.getTime() + t * tierDurationMs);
                    let tierEnd = new Date(meta.startDate.getTime() + (t + 1) * tierDurationMs);
                    if (t === numTiers - 1) {
                        tierEnd = new Date(meta.endDate);
                    } else {
                        tierEnd.setDate(tierEnd.getDate() - 1);
                    }

                    const rentPerSqm = baseRentPerSqm + t * tierIncrease;
                    const rent = rentPerSqm * meta.area;

                    // Fix: Apply 70/30 Split strictly (Aligns with seedContracts logic)
                    const rentAmount = Math.floor(rent * 0.7);
                    const serviceFee = Math.floor(rent * 0.3);

                    periodData.push({
                        contractUnitId: unit.id,
                        startDate: tierStart,
                        endDate: tierEnd,
                        rentAmount,
                        serviceFee,
                    });
                }
            }

            // Single insert for all periods
            await queryRunner.manager.insert(RentPeriod, periodData);
            this.logger.log(`Inserted ${periodData.length} rent periods`);


            await queryRunner.commitTransaction();
            this.logger.log("Seeding complete!");
            return { success: true, message: 'Mock data generated successfully' };
        } catch (err) {
            this.logger.error("Seeding failed", err);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    // ========== STEP-BY-STEP SEEDING METHODS ==========

    async seedBuildings() {
        this.logger.log("Seeding Buildings...");

        // Ensure company exists first
        let company = await this.companyRepo.findOne({ where: {} });
        if (!company) {
            await this.seedAdminOnly();
            company = await this.companyRepo.findOne({ where: {} });
        }

        const buildingData: Partial<Building>[] = [];
        const buildingNames = ['Kingbridge Tower', 'Meridian Plaza', 'Skyline Center'];

        for (let i = 0; i < 3; i++) {
            buildingData.push({
                companyId: company!.id,
                name: buildingNames[i],
                code: `KT-${String.fromCharCode(65 + i)}`,
                totalFloors: faker.number.int({ min: 10, max: 40 }),
                rentableArea: faker.number.int({ min: 5000, max: 30000 }),
            });
        }

        await this.dataSource.manager.insert(Building, buildingData);
        const count = await this.dataSource.manager.count(Building);
        this.logger.log(`Created ${buildingData.length} buildings (total: ${count})`);

        return { success: true, message: `Created ${buildingData.length} buildings`, count };
    }

    async seedCustomers() {
        this.logger.log("Seeding Customers...");

        const company = await this.companyRepo.findOne({ where: {} });
        if (!company) {
            throw new Error('Company not found. Please run seedBuildings first.');
        }

        const customerData: Partial<Customer>[] = [];
        for (let i = 0; i < 100; i++) {
            const type = faker.helpers.arrayElement(['corporate', 'individual']);
            const custName = type === 'corporate' ? faker.company.name() : faker.person.fullName();
            customerData.push({
                companyId: company.id,
                type: type as any,
                name: custName,
                taxId: faker.finance.accountNumber(13),
                addressNo: faker.location.buildingNumber(),
                street: faker.location.street(),
                subDistrict: faker.helpers.arrayElement(['Pathum Wan', 'Khlong Toei', 'Bang Rak', 'Sathon']),
                district: faker.helpers.arrayElement(['Pathum Wan', 'Khlong Toei', 'Bang Rak', 'Sathon']),
                province: 'Bangkok',
                postalCode: faker.helpers.arrayElement(['10110', '10120', '10330', '10500']),
                phone: faker.string.numeric(10),
                email: faker.internet.email(),
                contactPerson: faker.person.fullName(),
            });
        }

        await this.dataSource.manager.insert(Customer, customerData);
        const count = await this.dataSource.manager.count(Customer);
        this.logger.log(`Created ${customerData.length} customers (total: ${count})`);

        return { success: true, message: `Created ${customerData.length} customers`, count };
    }

    async seedContracts() {
        this.logger.log("Seeding Contracts with Capacity Validation...");

        const company = await this.companyRepo.findOne({ where: {} });
        if (!company) {
            throw new Error('Company not found. Please run seedBuildings first.');
        }

        const buildings = await this.dataSource.manager.find(Building, { where: { companyId: company.id } });
        const customers = await this.dataSource.manager.find(Customer, { where: { companyId: company.id } });
        const adminUser = await this.userRepo.findOne({ where: { email: 'admin@kingbridge.com' } });

        if (buildings.length === 0) throw new Error('No buildings found. Please run seedBuildings first.');
        if (customers.length === 0) throw new Error('No customers found. Please run seedCustomers first.');
        if (!adminUser) throw new Error('Admin user not found. Please run seedBuildings first.');

        // Initialize Capacity Tracker: buildingId -> List of { start, end, area }
        const buildingUsage: Record<string, { start: number, end: number, area: number }[]> = {};
        buildings.forEach(b => buildingUsage[b.id] = []);

        // Helper: Check max occupancy in a date range using Sweep Line
        const getMaxOccupancy = (buildingId: string, startDate: Date, endDate: Date): number => {
            const usage = buildingUsage[buildingId] || [];
            const startMs = startDate.getTime();
            const endMs = endDate.getTime();

            // Filter relevant intervals
            const relevant = usage.filter(u => u.start < endMs && u.end > startMs);
            if (relevant.length === 0) return 0;

            // Collect time points
            const points: { time: number; type: 'start' | 'end'; area: number }[] = [];
            relevant.forEach(u => {
                points.push({ time: Math.max(startMs, u.start), type: 'start', area: u.area });
                points.push({ time: Math.min(endMs, u.end), type: 'end', area: u.area });
            });

            // Sort points
            points.sort((a, b) => {
                if (a.time !== b.time) return a.time - b.time;
                // Process 'start' before 'end' at same time to be conservative (though not strictly necessary for strict < )
                return a.type === 'start' ? -1 : 1;
            });

            let maxArea = 0;
            let currentArea = 0;

            points.forEach(p => {
                if (p.type === 'start') {
                    currentArea += p.area;
                    if (currentArea > maxArea) maxArea = currentArea;
                } else {
                    currentArea -= p.area;
                }
            });

            return maxArea;
        };

        // Planning Phase
        const plannedContracts: any[] = [];
        const plannedUnits: any[] = [];
        const targetCount = 50; // Reduced from 300 to prevent Vercel Timeout (10s limit)
        let attempts = 0;
        const maxAttempts = 1000; // Limit to prevent infinite loop

        while (plannedContracts.length < targetCount && attempts < maxAttempts) {
            attempts++;
            const customer = faker.helpers.arrayElement(customers);
            const building = faker.helpers.arrayElement(buildings);

            // 1. Determine Status & Dates
            const isExpired = Math.random() < 0.2; // 20% Expired
            let startDate: Date, endDate: Date, status: string;

            if (isExpired) {
                status = 'expired';
                const pastEnd = new Date();
                pastEnd.setMonth(pastEnd.getMonth() - faker.number.int({ min: 1, max: 24 })); // Ended 1-24 months ago
                endDate = pastEnd;
                startDate = new Date(pastEnd);
                startDate.setFullYear(startDate.getFullYear() - faker.number.int({ min: 1, max: 3 }));
            } else {
                status = faker.helpers.arrayElement(['active', 'active', 'active', 'draft']);
                startDate = faker.date.between({ from: '2023-01-01', to: '2025-12-31' }); // Current/Past start
                endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + faker.number.int({ min: 1, max: 3 }));
            }

            // 2. Plan Units & Check Capacity
            const numFloors = faker.number.int({ min: 1, max: 2 });
            const tempUnits: any[] = [];
            let totalNewArea = 0;

            for (let f = 0; f < numFloors; f++) {
                const area = faker.number.float({ min: 50, max: 500, fractionDigits: 2 }); // Smaller units to fit easier
                tempUnits.push({
                    buildingId: building.id,
                    floor: faker.number.int({ min: 1, max: building.totalFloors }).toString(),
                    areaSqm: area
                });
                totalNewArea += area;
            }

            // 3. Validate
            const currentMaxUsage = getMaxOccupancy(building.id, startDate, endDate);
            if (currentMaxUsage + totalNewArea > building.rentableArea) {
                continue; // Skip if full
            }

            // 4. Commit to Plan
            const contractNo = `CNT-${startDate.getFullYear()}-${String(plannedContracts.length + 1).padStart(4, '0')}`;

            // Record usage
            buildingUsage[building.id].push({
                start: startDate.getTime(),
                end: endDate.getTime(),
                area: totalNewArea
            });

            plannedContracts.push({
                contractNo,
                customerId: customer.id,
                companyId: company.id,
                status,
                startDate,
                endDate,
                depositAmount: faker.number.int({ min: 50000, max: 500000 }),
                createdBy: adminUser.id,
            });

            tempUnits.forEach(u => {
                plannedUnits.push({
                    contractNo, // Link key
                    startDate,
                    endDate,
                    ...u
                });
            });
        }

        this.logger.log(`Planned ${plannedContracts.length} contracts (Attempts: ${attempts})`);

        // Execution Phase - Batch Insert

        // 1. Insert Contracts
        await this.dataSource.manager.insert(RentContract, plannedContracts);

        // 2. Fetch IDs
        const savedContracts = await this.dataSource.manager.find(RentContract, {
            where: { companyId: company.id },
            select: ['id', 'contractNo']
        });
        const contractMap = new Map(savedContracts.map(c => [c.contractNo, c.id]));

        // 3. Prepare Units with Contract IDs
        const unitInserts: Partial<ContractUnit>[] = plannedUnits.map(p => ({
            contractId: contractMap.get(p.contractNo)!,
            buildingId: p.buildingId,
            floor: p.floor,
            areaSqm: p.areaSqm
        }));

        await this.dataSource.manager.insert(ContractUnit, unitInserts);

        // 4. Fetch Units for Rent Periods
        // We need to link units to their planned dates. 
        // Since we can't easily map back from bulk insert without complex queries,
        // we'll fetch units with their contracts to get dates.
        const savedUnits = await this.dataSource.manager.find(ContractUnit, {
            relations: ['contract'],
            where: { contractId: In(Array.from(contractMap.values())) }
        });

        // 5. Generate Rent Periods
        const periodData: Partial<RentPeriod>[] = [];

        for (const unit of savedUnits) {
            const contract = unit.contract;
            const startDate = new Date(contract.startDate);
            const endDate = new Date(contract.endDate);
            const area = unit.areaSqm;

            const numTiers = faker.number.int({ min: 1, max: 3 });
            const durationMs = endDate.getTime() - startDate.getTime();
            const tierDuration = durationMs / numTiers;
            const basePrice = faker.number.int({ min: 400, max: 1000 });

            for (let t = 0; t < numTiers; t++) {
                const tierStart = new Date(startDate.getTime() + t * tierDuration);
                let tierEnd = new Date(startDate.getTime() + (t + 1) * tierDuration);
                if (t === numTiers - 1) tierEnd = new Date(endDate);
                else tierEnd.setDate(tierEnd.getDate() - 1);

                const priceInfo = basePrice + (t * 50);
                const totalRent = priceInfo * area;

                // 70/30 Logic
                const rentAmount = Math.floor(totalRent * 0.7);
                const serviceFee = Math.floor(totalRent * 0.3);

                periodData.push({
                    contractUnitId: unit.id,
                    startDate: tierStart,
                    endDate: tierEnd,
                    rentAmount,
                    serviceFee
                });
            }
        }

        await this.dataSource.manager.insert(RentPeriod, periodData);
        this.logger.log(`Inserted ${periodData.length} rent periods with 70/30 split`);

        return {
            success: true,
            message: `Generated ${plannedContracts.length} contracts with validated capacity`,
            contracts: plannedContracts.length
        };
    }

    async resetData() {
        this.logger.warn("RESET DATA REQUESTED - DROPPING ALL TABLES");
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        try {
            await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

            const tables = await queryRunner.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                AND table_name != 'typeorm_metadata'
            `);

            this.logger.log(`Found ${tables.length} tables to clear`);

            for (const table of tables) {
                const tableName = table.TABLE_NAME || table.table_name;
                this.logger.log(`Clearing table: ${tableName}`);
                try {
                    await queryRunner.query(`TRUNCATE TABLE \`${tableName}\``);
                } catch (e) {
                    this.logger.warn(`Truncate failed for ${tableName}, trying DELETE. Error: ${e.message}`);
                    await queryRunner.query(`DELETE FROM \`${tableName}\``);
                }
            }

            await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');

            // Re-seed admin only
            this.logger.log("Re-seeding Admin User...");
            await this.seedAdminOnly();

            return { success: true, message: "Database reset complete" };
        } catch (error) {
            this.logger.error("Reset failed", error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
