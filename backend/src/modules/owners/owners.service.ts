import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Owner } from './owner.entity';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,
  ) {}

  async create(createDto: CreateOwnerDto, companyId: string): Promise<Owner> {
    const owner = this.ownerRepository.create({
      ...createDto,
      companyId,
    });

    return this.ownerRepository.save(owner);
  }

  async findAll(companyId: string): Promise<Owner[]> {
    return this.ownerRepository.find({
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Owner> {
    const owner = await this.ownerRepository.findOne({
      where: { id, companyId },
    });

    if (!owner) {
      throw new NotFoundException('Owner not found');
    }

    return owner;
  }

  async update(
    id: string,
    updateDto: UpdateOwnerDto,
    companyId: string,
  ): Promise<Owner> {
    const owner = await this.findOne(id, companyId);
    Object.assign(owner, updateDto);
    return this.ownerRepository.save(owner);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const owner = await this.findOne(id, companyId);
    await this.ownerRepository.softRemove(owner);
  }
}
