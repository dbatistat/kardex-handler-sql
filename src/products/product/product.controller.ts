import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product } from '../product.entity';

@Controller('products')
export class ProductController {
    constructor(private service: ProductService){}

    @Get()
    index(): Promise<Product[]> {
        return this.service.findAll();
    }

    @Post('create')
    async create(@Body() data: Product): Promise<any> {
      return this.service.create(data);
    }

    @Put(':id/update')
    async update(@Param('id') id, @Body() data: Product): Promise<any> {
        data.id = Number(id);
        return this.service.update(data);
    }

    @Delete(':id/delete')
    async delete(@Param('id') id): Promise<any> {
      return this.service.delete(id);
    }

}
