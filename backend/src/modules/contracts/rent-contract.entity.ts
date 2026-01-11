import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { VersionedEntity } from '../../shared/entities/base.entity';
import { Company } from '../companies/company.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { ContractUnit } from './contract-unit.entity';
import { ContractDocument } from './contract-document.entity';

export enum ContractStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    EXPIRED = 'expired',
    TERMINATED = 'terminated',
    CANCELLED = 'cancelled',
}

@Entity('rent_contracts')
export class RentContract extends VersionedEntity {
    @Column({ name: 'company_id' })
    companyId: string;

    @Column({ name: 'customer_id' })
    customerId: string;

    @Column({ name: 'contract_no', length: 50 })
    contractNo: string;

    @Column({ name: 'start_date', type: 'date' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date' })
    endDate: Date;

    @Column({ name: 'deposit_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
    depositAmount: number;

    @Column({
        type: 'enum',
        enum: ContractStatus,
        default: ContractStatus.DRAFT,
    })
    status: ContractStatus;

    @Column({ name: 'previous_contract_id', nullable: true })
    previousContractId: string | null;

    @Column({ name: 'renewal_count', default: 0 })
    renewalCount: number;

    @Column({ name: 'created_by' })
    createdBy: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    // Relations
    @ManyToOne(() => Company, (company) => company.contracts)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @ManyToOne(() => Customer, (customer) => customer.contracts)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @ManyToOne(() => RentContract, { nullable: true })
    @JoinColumn({ name: 'previous_contract_id' })
    previousContract: RentContract | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @OneToMany(() => ContractUnit, (contractUnit) => contractUnit.contract, { cascade: true })
    contractUnits: ContractUnit[];

    @OneToMany(() => ContractDocument, (doc) => doc.contract, { cascade: true })
    documents: ContractDocument[];
}
