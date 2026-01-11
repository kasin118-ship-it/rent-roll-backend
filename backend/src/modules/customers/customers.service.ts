import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
    ) { }

    async findAll(companyId: string): Promise<Customer[]> {
        return this.customerRepository.find({
            where: { companyId },
            relations: ['contracts'],
            order: { name: 'ASC' },
        });
    }

    async findOne(id: string, companyId: string): Promise<Customer | null> {
        return this.customerRepository.findOne({
            where: { id, companyId },
            relations: ['contracts'],
        });
    }

    async create(data: Partial<Customer>, companyId: string): Promise<Customer> {
        const customer = this.customerRepository.create({
            ...data,
            companyId,
        });
        return this.customerRepository.save(customer);
    }

    async update(id: string, data: Partial<Customer>, companyId: string): Promise<Customer | null> {
        await this.customerRepository.update({ id, companyId }, data);
        return this.findOne(id, companyId);
    }

    async remove(id: string, companyId: string): Promise<void> {
        await this.customerRepository.delete({ id, companyId });
    }
}
