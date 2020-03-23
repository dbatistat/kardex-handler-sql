import { Injectable } from '@nestjs/common';
import { Nack, RabbitRPC } from '@nestjs-plus/rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { DeleteResult, Repository, UpdateResult } from 'typeorm';
import { AddProduct } from './interface/add-product.interface';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Product)
    private repository: Repository<Product>,
  ) {
  }

  async findAll(): Promise<Product[]> {
    return await this.repository.find();
  }

  async create(entity: Product): Promise<Product> {
    return await this.repository.save(entity);
  }

  async update(entity: Product): Promise<UpdateResult> {
    return await this.repository.update(entity.id, entity);
  }

  async delete(id): Promise<DeleteResult> {
    return await this.repository.delete(id);
  }

  @RabbitRPC({
    exchange: 'kardex',
    routingKey: 'add-product',
    queue: 'kardex-sql',
  })
  public async addProduct(product: AddProduct) {
    console.log('RABBIT RESPONSE', product);
    try {
      const newProduct = new Product();
      newProduct.price = product.price;
      newProduct.quantity = product.qty;
      newProduct.productCode = product.productCode;
      newProduct.registerDate = product.registerDate;
      return await this.repository.save(newProduct);
    } catch (e) {
      console.log('ERROR:', e);
      return new Nack(true);
    }
  }

}
