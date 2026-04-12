import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';

@Entity('driver_vehicle_assignments')
@Index(['driver_id', 'assigned_at'])  // Tìm lịch sử chạy của 1 tài xế siêu tốc
@Index(['vehicle_id', 'assigned_at']) // Tìm xem xe này ai đang mượn siêu tốc
export class DriverVehicleAssignment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    driver_id: string;

    @Column({ type: 'uuid' })
    vehicle_id: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    assigned_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    unassigned_at: Date; // Null nghĩa là tài xế đang giữ xe. Có giờ nghĩa là đã trả xe.

    // --- Quan hệ (Relations) ---
    @ManyToOne(() => User)
    @JoinColumn({ name: 'driver_id' })
    driver: User;

    @ManyToOne(() => Vehicle)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;
}