import { Injectable } from '@nestjs/common';
import { AmqpConnection, Nack, RabbitRPC } from '@nestjs-plus/rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';
import { AddProduct } from './interface/add-product.interface';
import { UpdateProduct } from './interface/update-product.interface';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Product) private productRepository: Repository<Product>,
    @InjectRepository(Event) private eventRepository: Repository<Event>,
    private readonly amqpConnection: AmqpConnection,
  ) {
  }

  @RabbitRPC({
    exchange: 'kardex',
    routingKey: 'add-product',
    queue: 'kardex-sql',
  })
  public async create(product: AddProduct) {
    console.log('ADD PRODUCT', product);
    try {
      const newProduct = new Product();
      newProduct.price = product.price;
      newProduct.quantity = product.qty;
      newProduct.productCode = product.productCode;
      newProduct.registerDate = product.registerDate;
      const result = await this.productRepository.save(newProduct);
      await this.createEvent(result, EnumEventType.CREATED);
      return result;
    } catch (e) {
      return new Nack(false);
    }
  }

  @RabbitRPC({
    exchange: 'kardex',
    routingKey: 'update-product',
    queue: 'kardex-sql',
  })
  async update({ id, qty, price }: UpdateProduct) {
    console.log('UPDATE PRODUCT', { id, qty, price });
    try {
      const entity = await this.productRepository.findOne({ id });
      if (!entity) {
        return;
      }
      entity.quantity = qty;
      entity.price = price;
      const result = await this.productRepository.update(entity.id, entity);
      await this.createEvent(result, EnumEventType.UPDATED);
      const qtyResult = entity.quantity - qty;
      this.updateQtyView({ qty: qtyResult, productCode: entity.productCode });
      this.updatePriceView({ productCode: entity.productCode, price });
      return result;
    } catch (e) {
      console.log('ERROR: ', e);
      return new Nack(true);
    }
  }

  private async createEvent(product, event: EnumEventType) {
    const newEvent = new Event();
    newEvent.type = EnumEventType.CREATED;
    newEvent.object = JSON.stringify(product);
    await this.eventRepository.save(newEvent);
  }

  private updateQtyView({ productCode, qty }) {
    if (qty >= 0) {
      this.amqpConnection.publish('kardex', 'substract-qty-product', { productCode, qty: Math.abs(qty) });
    } else {
      this.amqpConnection.publish('kardex', 'add-qty-product', { productCode, qty: Math.abs(qty) });
    }
  }

  private updatePriceView({ productCode, price }) {
    this.amqpConnection.publish('kardex', 'change-price-product', { productCode, price });
  }
}
