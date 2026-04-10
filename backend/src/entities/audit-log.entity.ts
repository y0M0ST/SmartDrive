import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { User } from './user.entity';
import { Agency } from './agency.entity';

@Entity('audit_logs')
@Index(['agency_id', 'created_at'])     // Nhà xe tra cứu log của nhân viên mình
@Index(['actor_user_id', 'created_at']) // Tra cứu 1 nhân viên cụ thể đã làm gì
export class AuditLog extends CoreEntity {
    @Column({ type: 'uuid', nullable: true })
    actor_user_id: string; // Ai là người thao tác (Null nếu hệ thống tự chạy)

    @Column({ type: 'uuid', nullable: true })
    agency_id: string;

    @Column({ type: 'varchar' })
    action: string; // CREATE_USER, BLOCK_USER, CANCEL_TRIP...

    @Column({ type: 'varchar' })
    target_type: string; // USER, TRIP, VEHICLE...

    @Column({ type: 'uuid', nullable: true })
    target_id: string; // ID của cái bị tác động

    @Column({ type: 'json', nullable: true })
    metadata: any; // Lưu JSON sự thay đổi (VD: { old_status: 'ACTIVE', new_status: 'BLOCKED' })

    // --- Quan hệ ---
    @ManyToOne(() => User)
    @JoinColumn({ name: 'actor_user_id' })
    actor: User;

    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;
}