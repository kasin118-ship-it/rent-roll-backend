import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { User } from '../users/user.entity';
import { Building } from '../buildings/building.entity';
import { Customer } from '../customers/customer.entity';
import { RentContract } from '../contracts/rent-contract.entity';

@Entity('companies')
export class Company extends BaseEntity {
    @Column({ length: 255 })
    name: string;

    @Column({ name: 'tax_id', length: 20 })
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

    @Column({ length: 50, default: 'Thailand' })
    country: string;

    @Column({ length: 20, nullable: true })
    phone: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    // Relations
    @OneToMany(() => User, (user) => user.company)
    users: User[];

    @OneToMany(() => Building, (building) => building.company)
    buildings: Building[];

    @OneToMany(() => Customer, (customer) => customer.company)
    customers: Customer[];

    @OneToMany(() => RentContract, (contract) => contract.company)
    contracts: RentContract[];
}
