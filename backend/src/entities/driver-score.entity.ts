import { Entity, Column, ManyToOne, JoinColumn, Index, UpdateDateColumn } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { User } from './user.entity';

@Entity('driver_scores')
@Index(['driver_id', 'month', 'year'], { unique: true }) // 1 tài xế chỉ có 1 bảng điểm cho 1 tháng
@Index(['year', 'month']) // Dùng để truy xuất BXH tháng của toàn nhà xe
export class DriverScore extends CoreEntity {
    @Column({ type: 'uuid' })
    driver_id: string;

    @Column({ type: 'int' })
    month: number;

    @Column({ type: 'int' })
    year: number;

    @Column({ type: 'int', default: 0 })
    total_trips: number;

    @Column({ type: 'int', default: 0 })
    total_drowsy: number;

    @Column({ type: 'int', default: 0 })
    total_distracted: number;

    @Column({ type: 'int', default: 0 })
    total_points_deducted: number;

    @Column({ type: 'int', default: 100 })
    final_score: number; // Clamp từ 0 -> 100

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    calculated_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    // --- Quan hệ ---
    @ManyToOne(() => User)
    @JoinColumn({ name: 'driver_id' })
    driver: User;
}