import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Building } from '../buildings/building.entity';
import { Floor } from '../floors/floor.entity';
import { ContractUnit } from '../contracts/contract-unit.entity';

export enum UnitStatus {
    VACANT = 'vacant',
    OCCUPIED = 'occupied',
    MAINTENANCE = 'maintenance',
}

@Entity('units')
export class Unit extends BaseEntity {
    @Column({ name: 'building_id' })
    buildingId: string;

    @Column({ name: 'floor_id' })
    floorId: string;

    @Column({ name: 'unit_no', length: 50 })
    unitNo: string;

    @Column({ name: 'area_sqm', type: 'decimal', precision: 10, scale: 2, default: 0 })
    areaSqm: number;

    @Column({
        type: 'enum',
        enum: UnitStatus,
        default: UnitStatus.VACANT,
    })
    status: UnitStatus;

    // Relations
    @ManyToOne(() => Building, (building) => building.units)
    @JoinColumn({ name: 'building_id' })
    building: Building;

    @ManyToOne(() => Floor, (floor) => floor.units)
    @JoinColumn({ name: 'floor_id' })
    floor: Floor;

    @OneToMany(() => ContractUnit, (contractUnit) => contractUnit.unit)
    contractUnits: ContractUnit[];
}
