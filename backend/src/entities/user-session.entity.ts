import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { User } from './user.entity';

@Entity('user_sessions')
@Index(['user_id', 'expires_at']) // Index check session nhanh
export class UserSession extends CoreEntity {
    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'varchar', unique: true })
    refresh_token_hash: string;

    @Column({ type: 'varchar', nullable: true })
    ip_address: string;

    @Column({ type: 'varchar', nullable: true })
    user_agent: string;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    issued_at: Date;

    @Column({ type: 'timestamptz' })
    expires_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    revoked_at: Date;

    // Quan hệ: 1 Session thuộc về 1 User
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}