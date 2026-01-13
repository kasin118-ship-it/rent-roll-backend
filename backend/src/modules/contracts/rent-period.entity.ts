import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractUnit } from './contract-unit.entity';

/**
 * RentPeriod - Represents a pricing tier for a specific rental unit
 * Each ContractUnit can have multiple RentPeriods (tiered pricing)
 * e.g., Year 1: 50,000/month, Year 2: 55,000/month
 */
@Entity('rent_periods')
export class RentPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_unit_id' })
  contractUnitId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ name: 'rent_amount', type: 'decimal', precision: 12, scale: 2 })
  rentAmount: number;

  @Column({
    name: 'service_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  serviceFee: number;

  @Column({ name: 'period_order', default: 1 })
  periodOrder: number;

  // Relations
  @ManyToOne(() => ContractUnit, (contractUnit) => contractUnit.rentPeriods, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_unit_id' })
  contractUnit: ContractUnit;

  // Computed helper - total monthly amount
  get totalMonthly(): number {
    return Number(this.rentAmount) + Number(this.serviceFee);
  }
}
