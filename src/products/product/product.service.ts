import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../product.entity';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product)
        private repository: Repository<Product>,
    ) { }

    async  findAll(): Promise<Product[]> {
        return await this.repository.find();
    }

    async  create(entity: Product): Promise<Product> {
        return await this.repository.save(entity);
    }

    async update(entity: Product): Promise<UpdateResult> {
        return await this.repository.update(entity.id, entity);
    }

    async delete(id): Promise<DeleteResult> {
        return await this.repository.delete(id);
    }
}
