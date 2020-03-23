import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    productCode: string;

    @Column()
    quantity: number;

    @Column()
    price: number;

    @Column()
    registerDate: Date = new Date();
}
