import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Building } from '../buildings/building.entity';

@Entity('floors')
export class Floor extends BaseEntity {
  @Column({ name: 'building_id' })
  buildingId: string;

  @Column({ name: 'floor_number', length: 10 })
  floorNumber: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({
    name: 'rentable_area',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  rentableArea: number;

  // Relations
  @ManyToOne(() => Building, (building) => building.floors)
  @JoinColumn({ name: 'building_id' })
  building: Building;
}
