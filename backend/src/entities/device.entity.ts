import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { Agency } from './agency.entity';
import { Vehicle } from './vehicle.entity';

@Entity('devices')
export class Device extends CoreEntity {
    @Column({ type: 'uuid' })
    agency_id: string;

    @Column({ type: 'uuid', nullable: true })
    vehicle_id: string;

    @Column({ type: 'varchar', unique: true })
    device_id: string; // Serial / MAC address của camera

    @Column({ type: 'varchar', default: 'ACTIVE' })
    status: string;

    @Column({ type: 'varchar', nullable: true })
    firmware_version: string;

    @Column({ type: 'timestamptz', nullable: true })
    last_seen_at: Date; // Dùng để check xem camera có đang bị rớt mạng không

    // --- Quan hệ (Relations) ---
    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;

    // Lắp trên xe nào
    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;
}