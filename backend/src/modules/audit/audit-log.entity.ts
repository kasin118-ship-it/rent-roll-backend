import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', nullable: true })
    userId: string;

    @Column({ name: 'company_id', nullable: true })
    companyId: string;

    @Column()
    action: string;

    @Column()
    endpoint: string;

    @Column({ name: 'request_body', type: 'text', nullable: true })
    requestBody: string;

    @Column({ name: 'response_data', type: 'text', nullable: true })
    responseData: string;

    @Column({ name: 'status_code' })
    statusCode: number;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'duration_ms', default: 0 })
    durationMs: number;

    @CreateDateColumn({ name: 'performed_at' })
    performedAt: Date;
}
