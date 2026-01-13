import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Company } from '../companies/company.entity';
import { Floor } from '../floors/floor.entity';


@Entity('buildings')
export class Building extends BaseEntity {
    @Column({ name: 'company_id' })
    companyId: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 50 })
    code: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ name: 'total_floors', default: 1 })
    totalFloors: number;

    @Column({ name: 'rentable_area', type: 'decimal', precision: 12, scale: 2, default: 0 })
    rentableArea: number;

    @Column({ name: 'construction_area', type: 'decimal', precision: 12, scale: 2, default: 0 })
    constructionArea: number;

    @Column({ name: 'owner_company', length: 255, nullable: true })
    ownerCompany: string;

    @Column({ name: 'owner_name', length: 255, nullable: true })
    ownerName: string;

    @Column({
        type: 'enum',
        enum: ['active', 'inactive'],
        default: 'active'
    })
    status: 'active' | 'inactive';

    // Relations
    @ManyToOne(() => Company, (company) => company.buildings)
    @JoinColumn({ name: 'company_id' })
    company: Company;

    @OneToMany(() => Floor, (floor) => floor.building)
    floors: Floor[];


}
