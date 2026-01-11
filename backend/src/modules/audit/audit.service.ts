import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>,
    ) { }

    async findAll(companyId: string, filters?: { action?: string; limit?: number }): Promise<AuditLog[]> {
        const query = this.auditLogRepository
            .createQueryBuilder('audit')
            .where('audit.company_id = :companyId', { companyId })
            .orderBy('audit.performed_at', 'DESC');

        if (filters?.action && filters.action !== 'ALL') {
            query.andWhere('audit.action = :action', { action: filters.action });
        }

        query.limit(filters?.limit || 100);

        return query.getMany();
    }

    async findOne(id: string, companyId: string): Promise<AuditLog | null> {
        return this.auditLogRepository.findOne({
            where: { id, companyId },
        });
    }
}
