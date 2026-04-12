import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { Agency } from './agency.entity';

@Entity('notifications')
export class Notification extends CoreEntity {
    @Column({ type: 'uuid' })
    agency_id: string;

    @Column({ type: 'varchar' })
    type: string; // VIOLATION_ALERT, SYSTEM...

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'varchar', nullable: true })
    ref_type: string; // TRIP, VIOLATION...

    @Column({ type: 'uuid', nullable: true })
    ref_id: string; // ID của chuyến đi hoặc ID của vi phạm liên quan

    // --- Quan hệ ---
    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;
}