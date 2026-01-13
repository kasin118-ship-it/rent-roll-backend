import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './company.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  /**
   * Get the first company (single-tenant architecture)
   */
  async getCompanyProfile(): Promise<Company | null> {
    return this.companyRepo.findOne({ where: {} });
  }

  /**
   * Update company profile
   */
  async updateCompanyProfile(data: Partial<Company>): Promise<Company> {
    let company = await this.getCompanyProfile();
    if (!company) {
      company = this.companyRepo.create(data);
    } else {
      Object.assign(company, data);
    }
    return this.companyRepo.save(company);
  }
}
