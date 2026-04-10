import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { Agency } from './agency.entity';
import { Role } from './role.entity';
import { UserStatus } from '../common/constants/enums';

@Entity('users')
@Index('uq_users_agency_email', ['agency_id', 'email'], { unique: true })
@Index('uq_users_agency_phone', ['agency_id', 'phone'], { unique: true })
@Index(['agency_id', 'status']) // Index hỗ trợ query nhanh
export class User extends BaseEntity {
    @Column({ type: 'uuid', nullable: true })
    agency_id: string;

    @Column({ type: 'uuid' })
    role_id: string;

    @Column({ type: 'varchar', unique: true })
    username: string;

    @Column({ type: 'varchar' })
    full_name: string;

    @Column({ type: 'varchar' })
    email: string;

    @Column({ type: 'varchar' })
    phone: string;

    @Column({ type: 'varchar' })
    password_hash: string;

    @Column({ type: 'varchar', default: UserStatus.ACTIVE })
    status: string;

    @Column({ type: 'int', default: 0 })
    failed_login_attempts: number;

    @Column({ type: 'timestamptz', nullable: true })
    locked_until: Date;

    @Column({ type: 'timestamptz', nullable: true })
    last_login_at: Date;

    @ManyToOne(() => Agency, (agency) => agency.users)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;
}