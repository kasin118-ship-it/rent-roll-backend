import { Entity, Column, ManyToOne, OneToMany, JoinColumn, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { RentContract } from './rent-contract.entity';
import { Unit } from '../units/unit.entity';
import { RentPeriod } from './rent-period.entity';
import { Building } from '../buildings/building.entity';

/**
 * ContractUnit - Links a Contract to a specific Unit (rental space)
 * Each ContractUnit can have multiple RentPeriods for tiered pricing
 */
@Entity('contract_units')
export class ContractUnit {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'contract_id' })
    contractId: string;

    @Column({ name: 'unit_id', nullable: true })
    unitId: string;

    @Column({ name: 'building_id', nullable: true })
    buildingId: string;

    @Column({ name: 'floor', length: 20, nullable: true })
    floor: string;

    @Column({ name: 'area_sqm', type: 'decimal', precision: 10, scale: 2, default: 0 })
    areaSqm: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => RentContract, (contract) => contract.contractUnits, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contract_id' })
    contract: RentContract;

    @ManyToOne(() => Unit, (unit) => unit.contractUnits, { nullable: true })
    @JoinColumn({ name: 'unit_id' })
    unit: Unit;

    @ManyToOne(() => Building)
    @JoinColumn({ name: 'building_id' })
    building: Building;

    @OneToMany(() => RentPeriod, (rentPeriod) => rentPeriod.contractUnit, { cascade: true })
    rentPeriods: RentPeriod[];

    // Computed helpers
    get currentRent(): number {
        if (!this.rentPeriods?.length) return 0;
        const now = new Date();
        const current = this.rentPeriods.find(p =>
            new Date(p.startDate) <= now && new Date(p.endDate) >= now
        );
        return current ? Number(current.rentAmount) : Number(this.rentPeriods[0].rentAmount);
    }

    get currentServiceFee(): number {
        if (!this.rentPeriods?.length) return 0;
        const now = new Date();
        const current = this.rentPeriods.find(p =>
            new Date(p.startDate) <= now && new Date(p.endDate) >= now
        );
        return current ? Number(current.serviceFee) : Number(this.rentPeriods[0].serviceFee);
    }
}
