import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base/base.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    code: string;

    @Column({ type: 'varchar', nullable: true })
    description: string;
}