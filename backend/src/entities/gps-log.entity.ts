import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { Trip } from './trip.entity';

@Entity('gps_logs')
@Index(['trip_id', 'recorded_at']) // Query vẽ đường đi của 1 chuyến
@Index(['recorded_at'])            // Dọn dẹp data cũ định kỳ
export class GpsLog extends CoreEntity {
    @Column({ type: 'uuid' })
    trip_id: string;

    @Column({ type: 'float' })
    latitude: number;

    @Column({ type: 'float' })
    longitude: number;

    @Column({ type: 'float' })
    speed: number;

    @Column({ type: 'float', nullable: true })
    heading: number; // Góc quay của xe (để vẽ icon xe trên bản đồ)

    @Column({ type: 'timestamptz' })
    recorded_at: Date; // Thời gian thiết bị ghi nhận tọa độ

    // Quan hệ
    @ManyToOne(() => Trip)
    @JoinColumn({ name: 'trip_id' })
    trip: Trip;
}