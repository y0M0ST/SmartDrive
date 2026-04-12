import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Trip } from './trip.entity';
import { User } from './user.entity';

@Entity('trip_status_histories')
@Index(['trip_id', 'changed_at']) // Query lịch sử trạng thái của 1 chuyến đi theo thứ tự thời gian
export class TripStatusHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    trip_id: string;

    @Column({ type: 'varchar', nullable: true })
    from_status: string;

    @Column({ type: 'varchar' })
    to_status: string;

    @Column({ type: 'uuid', nullable: true })
    changed_by: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    changed_at: Date;

    @Column({ type: 'varchar', nullable: true })
    note: string;

    // --- Quan hệ (Relations) ---
    @ManyToOne(() => Trip)
    @JoinColumn({ name: 'trip_id' })
    trip: Trip;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'changed_by' })
    changer: User; // Ai là người thao tác đổi trạng thái (Tài xế hoặc Điều phối)
}