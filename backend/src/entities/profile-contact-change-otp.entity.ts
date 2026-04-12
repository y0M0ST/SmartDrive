import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { User } from './user.entity';

export type ProfileContactChangeKind = 'EMAIL' | 'PHONE';

@Entity('profile_contact_change_otps')
@Index(['user_id', 'kind', 'used_at'])
export class ProfileContactChangeOtp extends CoreEntity {
    @Column({ type: 'uuid' })
    user_id: string;

    @Column({ type: 'varchar', length: 16 })
    kind: ProfileContactChangeKind;

    /** Email hoặc SĐT mới (đã chuẩn hóa) sẽ ghi vào user khi verify thành công */
    @Column({ type: 'varchar', length: 320 })
    new_value: string;

    @Column({ type: 'varchar', length: 64 })
    otp_hash: string;

    @Column({ type: 'timestamptz' })
    expires_at: Date;

    @Column({ type: 'timestamptz', nullable: true })
    used_at: Date | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}
