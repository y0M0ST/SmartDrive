import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { Agency } from './agency.entity';
import { Route } from './route.entity';
import { Vehicle } from './vehicle.entity';
import { User } from './user.entity';
import { AiViolation } from './ai-violation.entity';
import { TripStatus } from '../common/constants/enums';

@Entity('trips')
@Index(['driver_id', 'departure_time']) // Để check xem tài xế có đang kẹt lịch chuyến khác không
@Index(['vehicle_id', 'departure_time']) // Để check xem xe có đang kẹt lịch không
@Index(['agency_id', 'status', 'departure_time']) // Dùng cho màn hình Dashboard của Điều phối viên
export class Trip extends BaseEntity {
    @Column({ type: 'uuid' })
    agency_id: string;

    @Column({ type: 'varchar', unique: true })
    trip_code: string;

    @Column({ type: 'uuid' })
    route_id: string;

    @Column({ type: 'uuid' })
    vehicle_id: string;

    @Column({ type: 'uuid' })
    driver_id: string;

    @Column({ type: 'timestamptz' })
    departure_time: Date; // Giờ xuất bến dự kiến

    @Column({ type: 'timestamptz' })
    planned_end_time: Date; // Giờ tới bến dự kiến

    @Column({ type: 'timestamptz', nullable: true })
    actual_start_time: Date; // Giờ xuất bến thực tế (tài xế bấm app)

    @Column({ type: 'timestamptz', nullable: true })
    actual_end_time: Date; // Giờ tới bến thực tế

    @Column({ type: 'varchar', default: TripStatus.SCHEDULED })
    status: string;

    @Column({ type: 'varchar', nullable: true })
    cancel_reason: string;

    // --- Quan hệ (Relations) ---
    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;

    @ManyToOne(() => Route)
    @JoinColumn({ name: 'route_id' })
    route: Route;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'driver_id' })
    driver: User; // User này mang role là Tài xế

    @OneToMany(() => AiViolation, (violation) => violation.trip)
    ai_violations: AiViolation[];
}