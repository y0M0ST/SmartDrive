import { Entity, Column, ManyToOne, JoinColumn, Index, UpdateDateColumn } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { User } from './user.entity';
import { Agency } from './agency.entity';

/**
 * US_13 — Điểm an toàn tích lũy theo tháng (VN `YYYY-MM`), phạm vi nhà xe.
 */
@Entity('driver_scores')
@Index(['agency_id', 'driver_id', 'evaluation_month'], { unique: true })
export class DriverScore extends CoreEntity {
    @Column({ type: 'uuid' })
    agency_id: string;

    @Column({ type: 'uuid' })
    driver_id: string;

    /** Theo lịch VN, ví dụ `2026-04` */
    @Column({ type: 'varchar', length: 7 })
    evaluation_month: string;

    @Column({ type: 'int', default: 0 })
    total_violations: number;

    @Column({ type: 'int', default: 0 })
    total_deducted_points: number;

    @Column({ type: 'int', default: 100 })
    final_score: number;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    calculated_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'driver_id' })
    driver: User;

    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;
}
