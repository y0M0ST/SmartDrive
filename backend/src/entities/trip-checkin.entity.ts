import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';
import { Device } from './device.entity';
import { CheckinResult } from '../common/constants/enums';

@Entity('trip_checkins')
@Index(['trip_id', 'checked_in_at'])    // Lọc lịch sử điểm danh của 1 chuyến
@Index(['driver_id', 'checked_in_at'])  // Xem tài xế này hôm nay quét mặt mấy lần
export class TripCheckin extends CoreEntity {
    @Column({ type: 'uuid' })
    trip_id: string;

    @Column({ type: 'uuid' })
    driver_id: string;

    @Column({ type: 'uuid' })
    device_id: string;

    @Column({ type: 'float', nullable: true })
    match_score: number; // Điểm khớp khuôn mặt (VD: 98.5%)

    @Column({ type: 'varchar' })
    result: string; // SUCCESS, FAILED, hoặc LOCKED

    @Column({ type: 'int', default: 0 })
    fail_count: number;

    @Column({ type: 'varchar', nullable: true })
    image_url: string; // Bằng chứng hình ảnh lúc quét mặt

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    checked_in_at: Date; // Giờ quét thực tế trên thiết bị

    // --- Quan hệ (Relations) ---
    @ManyToOne(() => Trip)
    @JoinColumn({ name: 'trip_id' })
    trip: Trip;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'driver_id' })
    driver: User;

    @ManyToOne(() => Device)
    @JoinColumn({ name: 'device_id' })
    device: Device;
}