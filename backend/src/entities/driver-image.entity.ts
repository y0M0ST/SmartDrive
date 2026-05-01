import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { DriverProfile } from './driver-profile.entity';

@Entity('driver_images')
@Index(['profile_id', 'created_at']) // Hỗ trợ sort ảnh mới nhất cực nhanh
export class DriverImage extends CoreEntity {
    @Column({ type: 'uuid' })
    profile_id: string;

    @Column({ type: 'varchar' })
    image_url: string;

    @Column({ type: 'boolean', default: false })
    is_primary: boolean; // Ảnh chính để xuất ra vector

    @Column({ type: 'float', nullable: true })
    face_quality_score: number; // Điểm do AI chấm lúc upload

    // Quan hệ: 1 Hồ sơ tài xế có thể có nhiều Ảnh
    @ManyToOne(() => DriverProfile)
    @JoinColumn({ name: 'profile_id' })
    profile: DriverProfile;
}