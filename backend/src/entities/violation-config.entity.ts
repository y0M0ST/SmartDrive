import { Entity, Column, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { ViolationType } from '../common/constants/enums';

@Entity('violation_configs')
@Index(['type', 'effective_from']) // Tìm nhanh config đang áp dụng theo loại lỗi
export class ViolationConfig extends CoreEntity {
    @Column({ type: 'varchar' })
    type: string; // Dùng Enum ViolationType (DROWSY, DISTRACTED)

    @Column({ type: 'int', default: 0 })
    points_to_subtract: number;

    @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    effective_from: Date;

    @Column({ type: 'timestamptz', nullable: true })
    effective_to: Date;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;
}