import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { RentContract } from '../contracts/rent-contract.entity';

export enum AlertType {
    EXPIRY_90 = 'expiry_90',
    EXPIRY_60 = 'expiry_60',
    EXPIRY_30 = 'expiry_30',
    EXPIRED = 'expired',
    CUSTOM = 'custom',
}

@Entity('alerts')
export class Alert {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'company_id' })
    companyId: string;

    @Column({ name: 'contract_id', nullable: true })
    contractId: string | null;

    @Column({ type: 'enum', enum: AlertType })
    type: AlertType;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => Company)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @ManyToOne(() => RentContract, { nullable: true })
    @JoinColumn({ name: 'contract_id' })
    contract: RentContract | null;
}
