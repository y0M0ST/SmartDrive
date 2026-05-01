import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { User } from './user.entity';

@Entity('password_reset_tokens')
@Index(['user_id', 'expires_at']) // Index hỗ trợ query nhanh
export class PasswordResetToken extends CoreEntity {
    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'varchar', unique: true })
    token_hash: string;

    @Column({ type: 'timestamptz' })
    expires_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    used_at: Date;

    // Quan hệ: 1 Token thuộc về 1 User
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}