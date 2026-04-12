import { Entity, Column, OneToOne, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { User } from './user.entity';
import { Agency } from './agency.entity';

@Entity('driver_profiles')
@Index(['agency_id', 'driver_code'], { unique: true }) // Không cho phép trùng mã tài xế trong 1 nhà xe
@Index(['agency_id', 'id_card'], { unique: true })     // Không cho phép trùng CMND/CCCD trong 1 nhà xe
export class DriverProfile extends BaseEntity {
    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'uuid' })
    agency_id: string;

    @Column({ type: 'varchar' })
    driver_code: string;

    @Column({ type: 'varchar' })
    id_card: string;

    @Column({ type: 'varchar' })
    license_class: string;

    @Column({ type: 'date' }) // Type 'date' trong Postgres chỉ lưu YYYY-MM-DD
    license_expires_at: Date;

    @Column({ type: 'text', nullable: true })
    face_encoding: string; // Lưu mảng vector embedding cực dài, nên dùng text

    // --- Quan hệ (Relations) ---

    // Quan hệ 1-1: Một User chỉ có 1 Profile tài xế
    @OneToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;
}