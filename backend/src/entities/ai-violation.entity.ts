import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';
import { Device } from './device.entity';
import { ViolationConfig } from './violation-config.entity';

@Entity('ai_violations')
@Index(['trip_id', 'occurred_at'])
@Index(['driver_id', 'occurred_at'])
@Index(['vehicle_id', 'occurred_at'])
@Index(['type', 'occurred_at'])
@Index(['is_read', 'occurred_at']) // Để Điều phối viên lọc các lỗi chưa đọc
export class AiViolation extends CoreEntity {
    @Column({ type: 'uuid' })
    trip_id: string;

    @Column({ type: 'uuid' })
    driver_id: string;

    @Column({ type: 'uuid' })
    vehicle_id: string;

    @Column({ type: 'uuid', nullable: true })
    device_id: string;

    @Column({ type: 'uuid', nullable: true })
    config_id: string; // Map với bảng config để biết lúc đó bị trừ mấy điểm

    @Column({ type: 'varchar', unique: true })
    device_event_id: string; // Chống dội data khi AI gửi lại nhiều lần

    @Column({ type: 'varchar' })
    type: string;

    @Column({ type: 'varchar' })
    image_url: string; // Ảnh bằng chứng tài xế ngủ gục

    @Column({ type: 'float', nullable: true })
    latitude: number;

    @Column({ type: 'float', nullable: true })
    longitude: number;

    @Column({ type: 'timestamptz' })
    occurred_at: Date; // Thời gian thực tế AI bắt lỗi trên xe

    @Column({ type: 'boolean', default: false })
    is_read: boolean;

    @Column({ type: 'uuid', nullable: true })
    acknowledged_by: string; // ID của Điều phối viên đã xác nhận lỗi này

    @Column({ type: 'timestamptz', nullable: true })
    acknowledged_at: Date;

    @Column({ type: 'varchar', default: 'SYNCED' })
    sync_status: string;

    @Column({ type: 'timestamptz', nullable: true })
    synced_at: Date;

    // --- Quan hệ (Relations) ---
    @ManyToOne(() => Trip)
    @JoinColumn({ name: 'trip_id' })
    trip: Trip;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'driver_id' })
    driver: User;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @ManyToOne(() => Device)
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @ManyToOne(() => ViolationConfig)
    @JoinColumn({ name: 'config_id' })
    config: ViolationConfig;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'acknowledged_by' })
    acknowledger: User;
}