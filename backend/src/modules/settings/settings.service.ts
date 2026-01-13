import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Building } from '../buildings/building.entity';
import { RentContract } from '../contracts/rent-contract.entity';
import { ContractUnit } from '../contracts/contract-unit.entity';
import { RentPeriod } from '../contracts/rent-period.entity';
import { Company } from '../companies/company.entity';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getExportData(companyId: string) {
    // Fetch all relevant data for Excel export
    const customers = await this.dataSource.manager.find(Customer, {
      where: { companyId },
    });
    const buildings = await this.dataSource.manager.find(Building, {
      where: { companyId },
    });

    const contracts = await this.dataSource.manager.find(RentContract, {
      where: { companyId },
      relations: ['contractUnits', 'contractUnits.rentPeriods'],
    });

    // Format contracts to match Excel util expected structure
    // DTO: { contractNo, customerId, startDate, endDate, status, notes, rentalSpaces: [], pricingTiers: [] }
    const formattedContracts = contracts.map((c) => ({
      contractNo: c.contractNo,
      customerId: c.customerId,
      startDate: c.startDate.toISOString().split('T')[0],
      endDate: c.endDate.toISOString().split('T')[0],
      depositAmount: c.depositAmount,
      status: c.status,
      notes: c.notes || '',
      rentalSpaces: c.contractUnits.map((cu) => ({
        buildingId: cu.buildingId,
        floor: cu.floor,
        areaSqm: cu.areaSqm,
      })),
      pricingTiers: c.contractUnits.flatMap((cu) =>
        cu.rentPeriods.map((rp, idx) => ({
          floor: cu.floor,
          tierOrder: idx + 1, // Approximation
          startDate: rp.startDate.toISOString().split('T')[0],
          endDate: rp.endDate.toISOString().split('T')[0],
          rentAmount: rp.rentAmount,
          serviceFee: rp.serviceFee,
        })),
      ),
    }));

    return {
      customers,
      buildings,
      contracts: formattedContracts,
    };
  }

  async importData(companyId: string, data: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Data structure from frontend: { customers: [], buildings: [], contractMaster: [], rentalSpaces: [], pricingTiers: [] }
      // Note: Frontend excel-utils `importExcelFile` returns array of { sheetName, data }
      // So we assume the controller transforms it or we verify sheet names here.

      // Since this is complex, let's assume specific predictable keys are passed to this service method.
      const {
        customers,
        buildings,
        contractMaster,
        rentalSpaces,
        pricingTiers,
      } = data;

      // 1. Import Customers
      if (customers && customers.length > 0) {
        for (const row of customers) {
          const existing = await queryRunner.manager.findOne(Customer, {
            where: { id: row.customer_id },
          });
          if (!existing) {
            await queryRunner.manager.save(Customer, {
              id: row.customer_id, // If provided (usually we want autogen, but mapping requires consistent ID)
              companyId,
              name: row.name,
              type: row.type || 'corporate',
              taxId: row.tax_id,
              phone: row.phone,
              email: row.email,
              contactPerson: row.contact_name,
            });
          }
        }
      }

      // 2. Import Buildings
      if (buildings && buildings.length > 0) {
        for (const row of buildings) {
          const existing = await queryRunner.manager.findOne(Building, {
            where: { id: row.building_id },
          });
          if (!existing) {
            await queryRunner.manager.save(Building, {
              id: row.building_id,
              companyId,
              name: row.name,
              code: row.building_id, // Fallback
              totalFloors: parseInt(row.total_floors),
              rentableArea: parseFloat(row.total_area_sqm),
            });
          }
        }
      }

      // 3. Import Contracts
      if (contractMaster && contractMaster.length > 0) {
        for (const row of contractMaster) {
          // Find customer
          const customer = await queryRunner.manager.findOne(Customer, {
            where: { id: row.customer_id },
          });
          if (!customer) continue; // Skip if customer not found

          // Create Contract
          let contract = await queryRunner.manager.findOne(RentContract, {
            where: { contractNo: row.contract_no },
          });
          if (!contract) {
            contract = queryRunner.manager.create(RentContract, {
              contractNo: row.contract_no,
              customerId: customer.id,
              companyId,
              startDate: new Date(row.start_date),
              endDate: new Date(row.end_date),
              depositAmount: parseFloat(row.deposit_amount) || 0,
              status: row.status || 'draft',
              notes: row.notes,
            });
            contract = await queryRunner.manager.save(contract);
          }

          // 4. Create Rental Spaces (ContractUnits)
          // Filter spaces for this contract
          const spaces = rentalSpaces.filter(
            (s: any) => s.contract_no === row.contract_no,
          );
          for (const space of spaces) {
            const building = await queryRunner.manager.findOne(Building, {
              where: { id: space.building_id },
            });
            if (!building) continue;

            const unit = await queryRunner.manager.save(ContractUnit, {
              contractId: contract.id,
              buildingId: building.id,
              floor: space.floor.toString(),
              areaSqm: parseFloat(space.area_sqm),
            });

            // 5. Create Pricing Tiers (RentPeriods)
            // Filter tiers for this contract AND floor
            // (Assuming simple mapping: 1 unit per floor per contract. If multiple units on same floor, this logic is ambiguous in template)
            // This matches the simplified "Excel-based" logic often requested.
            const tiers = pricingTiers.filter(
              (t: any) =>
                t.contract_no === row.contract_no &&
                t.floor.toString() === space.floor.toString(),
            );

            for (const tier of tiers) {
              await queryRunner.manager.save(RentPeriod, {
                contractUnitId: unit.id,
                startDate: new Date(tier.start_date),
                endDate: new Date(tier.end_date),
                rentAmount: parseFloat(tier.rent_amount),
                serviceFee: parseFloat(tier.service_fee),
              });
            }
          }
        }
      }

      await queryRunner.commitTransaction();
      return {
        success: true,
        message: `Imported ${contractMaster?.length || 0} contracts`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Import failed', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
