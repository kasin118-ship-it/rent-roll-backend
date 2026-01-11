import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Company } from '../companies/company.entity';
import { RentContract } from '../contracts/rent-contract.entity';

export enum CustomerType {
    INDIVIDUAL = 'individual',
    CORPORATE = 'corporate',
}

@Entity('customers')
export class Customer extends BaseEntity {
    @Column({ name: 'company_id' })
    companyId: string;

    @Column({
        type: 'enum',
        enum: CustomerType,
    })
    type: CustomerType;

    @Column({ length: 255 })
    name: string;

    @Column({ name: 'tax_id', length: 20, nullable: true })
    taxId: string;

    @Column({ name: 'address_no', length: 50, nullable: true })
    addressNo: string;

    @Column({ length: 100, nullable: true })
    street: string;

    @Column({ name: 'sub_district', length: 100, nullable: true })
    subDistrict: string;

    @Column({ length: 100, nullable: true })
    district: string;

    @Column({ length: 100, nullable: true })
    province: string;

    @Column({ name: 'postal_code', length: 10, nullable: true })
    postalCode: string;

    @Column({ length: 20, nullable: true })
    phone: string;

    @Column({ length: 100, nullable: true })
    email: string;

    @Column({ name: 'contact_person', length: 100, nullable: true })
    contactPerson: string;

    // Relations
    @ManyToOne(() => Company, (company) => company.customers)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @OneToMany(() => RentContract, (contract) => contract.customer)
    contracts: RentContract[];
}
