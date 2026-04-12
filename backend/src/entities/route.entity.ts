import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { Agency } from './agency.entity';
import { RouteStatus } from '../common/constants/enums';

@Entity('routes')
@Index(['agency_id', 'code'], { unique: true }) // Mã tuyến nội bộ không được trùng trong 1 nhà xe
@Index('uq_routes_agency_name_start_end_active', ['agency_id', 'name', 'start_point', 'end_point'], {
    unique: true,
    where: '"deleted_at" IS NULL',
}) // Cùng nhà xe không trùng bộ (tên + điểm đi + điểm đến) trên bản ghi đang hoạt động
@Index(['agency_id', 'status']) // Lọc các tuyến theo trạng thái
export class Route extends BaseEntity {
    @Column({ type: 'uuid' })
    agency_id: string;

    @Column({ type: 'varchar' })
    code: string;

    @Column({ type: 'varchar' })
    name: string;

    /** Mã tỉnh/thành (VIETNAM_PROVINCES.code), ví dụ DA_NANG */
    @Column({ type: 'varchar' })
    start_point: string;

    /** Mã tỉnh/thành (VIETNAM_PROVINCES.code) */
    @Column({ type: 'varchar' })
    end_point: string;

    @Column({ type: 'float' })
    distance_km: number;

    @Column({ type: 'float' })
    estimated_hours: number;

    @Column({ type: 'varchar', default: RouteStatus.ACTIVE })
    status: RouteStatus;

    // Quan hệ: Tuyến đường thuộc về 1 Nhà xe
    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;
}