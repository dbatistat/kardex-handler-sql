import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@nestjs-plus/rabbitmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Event } from './entities/event.entity';
import { AppService } from './app.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Product, Event]),
    RabbitMQModule.forRoot({
      uri: 'amqp://user:kv8aq5f3tK9V@34.70.32.54:5672',
      exchanges: [
        {
          name: 'kardex',
          type: 'topic',
        },
      ],
    }),
  ],
  providers: [AppService],
})
export class AppModule {
}
