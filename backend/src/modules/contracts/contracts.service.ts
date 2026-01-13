import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  In,
  LessThan,
  MoreThan,
  Between,
} from 'typeorm';
import { RentContract, ContractStatus } from './rent-contract.entity';
import { ContractUnit } from './contract-unit.entity';
import { RentPeriod } from './rent-period.entity';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractDocument } from './contract-document.entity';
import { GcsService } from '../gcs/gcs.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(RentContract)
    private readonly contractRepository: Repository<RentContract>,
    @InjectRepository(ContractUnit)
    private readonly contractUnitRepository: Repository<ContractUnit>,
    @InjectRepository(RentPeriod)
    private readonly rentPeriodRepository: Repository<RentPeriod>,

    @InjectRepository(ContractDocument)
    private readonly documentRepository: Repository<ContractDocument>,
    private readonly gcsService: GcsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateContractDto,
    userId: string,
    companyId: string,
    files?: Express.Multer.File[],
  ): Promise<RentContract> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate Dates
      if (new Date(createDto.startDate) >= new Date(createDto.endDate)) {
        throw new BadRequestException('End date must be after start date');
      }

      // 2. Validate Rent Periods (per space)
      if (createDto.rentalSpaces) {
        for (const space of createDto.rentalSpaces) {
          this.validateRentPeriods(
            space.rentPeriods,
            createDto.startDate,
            createDto.endDate,
          );
        }
      }

      // 4. Create Contract
      const contract = queryRunner.manager.create(RentContract, {
        companyId,
        customerId: createDto.customerId,
        contractNo: createDto.contractNo,
        startDate: createDto.startDate,
        endDate: createDto.endDate,
        depositAmount: createDto.depositAmount || 0,
        status: ContractStatus.DRAFT,
        createdBy: userId,
        notes: createDto.notes,
      });

      const savedContract = await queryRunner.manager.save(contract);

      // 5. Create Rental Spaces & Pricing Tiers
      if (createDto.rentalSpaces) {
        for (const spaceDto of createDto.rentalSpaces) {
          // Create ContractUnit (Rental Space)
          const contractUnit = queryRunner.manager.create(ContractUnit, {
            contractId: savedContract.id,
            buildingId: spaceDto.buildingId,
            floor: spaceDto.floor,
            areaSqm: spaceDto.areaSqm,
          });
          const savedUnit = await queryRunner.manager.save(contractUnit);

          // Create RentPeriods for this Space
          const rentPeriods = spaceDto.rentPeriods.map((period, index) =>
            queryRunner.manager.create(RentPeriod, {
              contractUnitId: savedUnit.id,
              startDate: period.startDate,
              endDate: period.endDate,
              rentAmount: period.rentAmount,
              serviceFee: (period as any).serviceFee || 0, // Add serviceFee
              periodOrder: index + 1,
            }),
          );
          await queryRunner.manager.save(rentPeriods);
        }
      }

      // 7. Upload Documents
      if (files && files.length > 0) {
        const documents = await Promise.all(
          files.map(async (file) => {
            const path = await this.gcsService.uploadFile(
              file,
              `contracts/${savedContract.id}`,
            );
            return queryRunner.manager.create(ContractDocument, {
              contractId: savedContract.id,
              fileName: file.originalname,
              filePath: path,
              fileSize: file.size,
              fileType: file.mimetype,
            });
          }),
        );
        await queryRunner.manager.save(documents);
      }

      // 8. Commit Transaction
      await queryRunner.commitTransaction();

      return this.findOne(savedContract.id, companyId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async activate(id: string, companyId: string): Promise<RentContract> {
    const contract = await this.findOne(id, companyId);

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Only draft contracts can be activated');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update contract status
      await queryRunner.manager.update(RentContract, id, {
        status: ContractStatus.ACTIVE,
      });

      await queryRunner.commitTransaction();
      return this.findOne(id, companyId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async terminate(id: string, companyId: string): Promise<RentContract> {
    const contract = await this.findOne(id, companyId);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Only active contracts can be terminated');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update contract status
      await queryRunner.manager.update(RentContract, id, {
        status: ContractStatus.TERMINATED,
      });

      await queryRunner.commitTransaction();
      return this.findOne(id, companyId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async renew(
    id: string,
    renewDto: CreateContractDto,
    userId: string,
    companyId: string,
  ): Promise<RentContract> {
    const previousContract = await this.findOne(id, companyId);

    if (previousContract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException('Only active contracts can be renewed');
    }

    // Create new contract with reference to previous
    const newContract = await this.create(
      {
        ...renewDto,
        // unitIds removed
      },
      userId,
      companyId,
    );

    // Update renewal info
    await this.contractRepository.update(newContract.id, {
      previousContractId: previousContract.id,
      renewalCount: previousContract.renewalCount + 1,
    });

    // Expire the previous contract
    await this.contractRepository.update(previousContract.id, {
      status: ContractStatus.EXPIRED,
    });

    return this.findOne(newContract.id, companyId);
  }

  async findAll(
    companyId: string,
    filters?: {
      status?: ContractStatus;
      customerId?: string;
      buildingId?: string;
    },
  ): Promise<RentContract[]> {
    const query = this.contractRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.customer', 'customer')
      .leftJoinAndSelect('c.contractUnits', 'cu')
      .leftJoinAndSelect('cu.building', 'directBuilding')
      .leftJoinAndSelect('cu.rentPeriods', 'rp')
      .where('c.company_id = :companyId', { companyId })
      .andWhere('c.deleted_at IS NULL')
      .orderBy('c.created_at', 'DESC');

    if (filters?.status) {
      query.andWhere('c.status = :status', { status: filters.status });
    }

    if (filters?.customerId) {
      query.andWhere('c.customer_id = :customerId', {
        customerId: filters.customerId,
      });
    }

    if (filters?.buildingId) {
      // Check both relation paths
      query.andWhere('directBuilding.id = :buildingId', {
        buildingId: filters.buildingId,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, companyId: string): Promise<RentContract> {
    const contract = await this.contractRepository.findOne({
      where: { id, companyId },
      relations: [
        'customer',
        'contractUnits',
        'contractUnits.building',
        'contractUnits.rentPeriods',
        'documents',
      ],
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async getExpiringContracts(
    companyId: string,
    days: number,
  ): Promise<RentContract[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.contractRepository.find({
      where: {
        companyId,
        status: ContractStatus.ACTIVE,
        endDate: Between(today, futureDate),
      },
      relations: ['customer', 'contractUnits'],
      order: { endDate: 'ASC' },
    });
  }

  private validateRentPeriods(
    periods: {
      startDate: string;
      endDate: string;
      rentAmount: number;
      serviceFee?: number;
    }[],
    contractStart: string,
    contractEnd: string,
  ): void {
    if (!periods || periods.length === 0) {
      throw new BadRequestException('At least one rent period is required');
    }

    // Sort periods by start date
    const sorted = [...periods].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    // Check first period starts at contract start
    if (sorted[0].startDate !== contractStart) {
      throw new BadRequestException(
        'First rent period must start at contract start date',
      );
    }

    // Check last period ends at contract end
    if (sorted[sorted.length - 1].endDate !== contractEnd) {
      throw new BadRequestException(
        'Last rent period must end at contract end date',
      );
    }

    // Check for gaps or overlaps
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.endDate !== next.startDate) {
        throw new BadRequestException(
          'Rent periods must be continuous without gaps or overlaps',
        );
      }
    }

    // Check all amounts are positive
    for (const period of periods) {
      if (period.rentAmount <= 0) {
        throw new BadRequestException('Rent amount must be greater than 0');
      }
    }
  }
}
