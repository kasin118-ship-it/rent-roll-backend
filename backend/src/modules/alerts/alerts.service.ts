import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Alert, AlertType } from './alert.entity';
import { RentContract, ContractStatus } from '../contracts/rent-contract.entity';

@Injectable()
export class AlertsService {
    private readonly logger = new Logger(AlertsService.name);

    constructor(
        @InjectRepository(Alert)
        private readonly alertRepository: Repository<Alert>,
        @InjectRepository(RentContract)
        private readonly contractRepository: Repository<RentContract>,
    ) { }

    async findAll(companyId: string, unreadOnly = false): Promise<Alert[]> {
        const where: any = { companyId };
        if (unreadOnly) {
            where.isRead = false;
        }
        return this.alertRepository.find({
            where,
            relations: ['contract', 'contract.customer'],
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }

    async getUnreadCount(companyId: string): Promise<number> {
        return this.alertRepository.count({
            where: { companyId, isRead: false },
        });
    }

    async markAsRead(id: string, companyId: string): Promise<void> {
        await this.alertRepository.update({ id, companyId }, { isRead: true });
    }

    async markAllAsRead(companyId: string): Promise<void> {
        await this.alertRepository.update({ companyId, isRead: false }, { isRead: true });
    }

    @Cron(CronExpression.EVERY_DAY_AT_6AM)
    async checkExpiringContracts(): Promise<void> {
        this.logger.log('Running daily contract expiry check...');

        const today = new Date();
        const thresholds = [
            { days: 90, type: AlertType.EXPIRY_90 },
            { days: 60, type: AlertType.EXPIRY_60 },
            { days: 30, type: AlertType.EXPIRY_30 },
        ];

        for (const { days, type } of thresholds) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + days);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

            const contracts = await this.contractRepository.find({
                where: {
                    status: ContractStatus.ACTIVE,
                    endDate: Between(startOfDay, endOfDay),
                },
                relations: ['customer', 'company'],
            });

            for (const contract of contracts) {
                // Check if alert already exists
                const existingAlert = await this.alertRepository.findOne({
                    where: {
                        contractId: contract.id,
                        type,
                    },
                });

                if (!existingAlert) {
                    const alert = this.alertRepository.create({
                        companyId: contract.companyId,
                        contractId: contract.id,
                        type,
                        title: `Contract ${contract.contractNo} expires in ${days} days`,
                        message: `Customer: ${contract.customer.name}. Contract ending on ${contract.endDate.toISOString().split('T')[0]}`,
                    });
                    await this.alertRepository.save(alert);
                    this.logger.log(`Created ${type} alert for contract ${contract.contractNo}`);
                }
            }
        }

        // Check for expired contracts
        const expiredContracts = await this.contractRepository.find({
            where: {
                status: ContractStatus.ACTIVE,
                endDate: LessThan(today),
            },
        });

        for (const contract of expiredContracts) {
            await this.contractRepository.update(contract.id, {
                status: ContractStatus.EXPIRED,
            });
            this.logger.log(`Marked contract ${contract.contractNo} as expired`);
        }

        this.logger.log('Contract expiry check completed');
    }
}
