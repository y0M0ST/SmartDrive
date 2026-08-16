import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { CoreEntity } from './base/base.entity';
import { Agency } from './agency.entity';

/**
 * US_17 — Cấu hình lương / thưởng / phạt theo nhà xe (một bản ghi mỗi agency).
 */
@Entity('salary_configs')
@Index(['agency_id'], { unique: true })
export class SalaryConfig extends CoreEntity {
    @Column({ type: 'uuid' })
    agency_id: string;

    /** Lương cứng tháng (VND, số nguyên). */
    @Column({ type: 'int' })
    base_salary: number;

    /** Thưởng mỗi chuyến hoàn thành trong tháng (VND). */
    @Column({ type: 'int' })
    bonus_per_trip: number;

    /** Phạt mỗi điểm trừ an toàn (VND). */
    @Column({ type: 'int' })
    penalty_per_point: number;

    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;
}
