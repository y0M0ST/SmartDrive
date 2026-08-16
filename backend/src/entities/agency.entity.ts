import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { User } from './user.entity';

@Entity('agencies')
export class Agency extends BaseEntity {
    @Column({ type: 'varchar', unique: true })
    code: string;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar', nullable: true })
    address: string;

    @Column({ type: 'varchar', nullable: true })
    phone: string;

    @Column({ type: 'varchar', default: 'ACTIVE' })
    status: string;

    // Quan hệ 1 Nhà xe có nhiều Users
    @OneToMany(() => User, (user) => user.agency)
    users: User[];
}