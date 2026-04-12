import { Entity, Column, ManyToOne, JoinColumn, Index, PrimaryColumn } from 'typeorm';
import { Notification } from './notification.entity';
import { User } from './user.entity';

@Entity('notification_reads')
@Index(['user_id', 'read_at']) // Query đếm số thông báo chưa đọc siêu tốc
export class NotificationRead {
    @PrimaryColumn({ type: 'uuid' })
    notification_id: string;

    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    read_at: Date;

    // --- Quan hệ ---
    @ManyToOne(() => Notification)
    @JoinColumn({ name: 'notification_id' })
    notification: Notification;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}