import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base/base.entity';

@Entity('roles')
export class Role extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    name: string;

    @Column({ type: 'varchar', nullable: true })
    description: string;
}