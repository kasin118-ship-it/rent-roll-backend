import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { RentContract } from './rent-contract.entity';

@Entity('contract_documents')
export class ContractDocument {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'contract_id' })
    contractId: string;

    @Column({ name: 'file_name', length: 255 })
    fileName: string;

    @Column({ name: 'file_path', length: 500 })
    filePath: string;

    @Column({ name: 'file_size' })
    fileSize: number;

    @Column({ name: 'file_type', length: 50, nullable: true })
    fileType: string;

    @CreateDateColumn({ name: 'uploaded_at' })
    uploadedAt: Date;

    // Relations
    @ManyToOne(() => RentContract, (contract) => contract.documents, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contract_id' })
    contract: RentContract;
}
