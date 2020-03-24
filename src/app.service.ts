import { Injectable } from '@nestjs/common';
import { AmqpConnection, Nack, RabbitRPC } from '@nestjs-plus/rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';
import { AddProduct } from './interface/add-product.interface';
import { RabbitmqMessage } from './interface/rabbitmq-message.interface';

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
    routingKey: 'products',
    queue: 'kardex-sql',
  })
  async rabbitMQMessage({ route, data }: RabbitmqMessage) {
    if (route === 'update-product') {
      await this.update(data);
    } else if (route === 'add-product') {
      await this.create(data);
    }
  }

  async createEvent(product, event: 'CREATED' | 'UPDATED') {
    const newEvent = new Event();
    newEvent.type = event;
    newEvent.object = JSON.stringify(product);
    return this.eventRepository.save(newEvent);
  }

  private async create(product: AddProduct) {
    console.log('ADD PRODUCT', product);
    try {
      const newProduct = new Product();
      newProduct.price = product.price;
      newProduct.quantity = product.qty;
      newProduct.productCode = product.productCode;
      newProduct.registerDate = new Date(product.registerDate);
      const result = await this.productRepository.save(newProduct);
      await this.createEvent(result, 'CREATED');
      return result;
    } catch (e) {
      return new Nack(false);
    }
  }

  private async update({ id, qty, price }) {
    try {
      const entity = await this.productRepository.findOne({ id });
      if (!entity) {
        return;
      }
      console.log('Entity qty', entity.quantity);
      console.log('qty', qty);
      const qtyResult = entity.quantity - qty;
      entity.quantity = qty;
      entity.price = price;
      const result = await this.productRepository.update(entity.id, entity);
      await this.createEvent(result, 'UPDATED');
      this.updateQtyView({ qty: qtyResult, productCode: entity.productCode });
      this.updatePriceView({ productCode: entity.productCode, price });
      return result;
    } catch (e) {
      console.log('ERROR: ', e);
      return new Nack(false);
    }
  }

  private updateQtyView({ productCode, qty }) {
    if (qty >= 0) {
      console.log('SEND SUBTRACT QTY', qty);
      this.amqpConnection.publish('kardex', 'products', {route: 'substract-qty-product', data: { productCode, qty: Math.abs(qty) }});
    } else {
      console.log('SEND ADD QTY', qty);
      this.amqpConnection.publish('kardex', 'products', {route: 'add-qty-product', data: { productCode, qty: Math.abs(qty) }});
    }
  }

  private updatePriceView({ productCode, price }) {
    this.amqpConnection.publish('kardex', 'products', {route: 'change-price-product', data: { productCode, price }});
  }
}
