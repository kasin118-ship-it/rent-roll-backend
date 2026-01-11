import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(createDto: CreateUserDto, companyId: string): Promise<User> {
        // Check email uniqueness
        const existing = await this.userRepository.findOne({
            where: { email: createDto.email },
        });
        if (existing) {
            throw new ConflictException('Email already exists');
        }

        const passwordHash = await argon2.hash(createDto.password);
        const user = this.userRepository.create({
            ...createDto,
            companyId,
            passwordHash,
        });

        return this.userRepository.save(user);
    }

    async findAll(companyId: string): Promise<User[]> {
        return this.userRepository.find({
            where: { companyId },
            relations: ['role'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string, companyId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id, companyId },
            relations: ['role'],
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async update(id: string, updateDto: UpdateUserDto, companyId: string): Promise<User> {
        const user = await this.findOne(id, companyId);

        if (updateDto.password) {
            (user as any).passwordHash = await argon2.hash(updateDto.password);
        }

        const { password, ...updateData } = updateDto;
        Object.assign(user, updateData);
        return this.userRepository.save(user);
    }

    async remove(id: string, companyId: string): Promise<void> {
        const user = await this.findOne(id, companyId);
        await this.userRepository.softRemove(user);
    }
}
