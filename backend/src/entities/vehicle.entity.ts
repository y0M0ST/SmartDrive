import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base/base.entity';
import { Agency } from './agency.entity';
import { VehicleType, VehicleStatus } from '../common/constants/enums'; // Kéo Enum vào xài

@Entity('vehicles')
@Index('uq_vehicles_agency_plate_active', ['agency_id', 'license_plate'], {
    unique: true,
    where: '"deleted_at" IS NULL',
}) // 1 nhà xe không có 2 xe trùng biển số đang hoạt động
@Index('uq_vehicles_agency_camera_active', ['agency_id', 'ai_camera_id'], {
    unique: true,
    where: '"deleted_at" IS NULL AND "ai_camera_id" IS NOT NULL',
}) // 1 nhà xe không gắn 1 camera cho 2 xe đang hoạt động
@Index(['agency_id', 'status'])                          // Tìm xe đang rảnh siêu lẹ
export class Vehicle extends BaseEntity {
    @Column({ type: 'uuid' })
    agency_id: string;

    @Column({ type: 'varchar' })
    license_plate: string;

    @Column({ type: 'varchar', default: VehicleType.SEAT })
    type: string;

    @Column({ type: 'int' })
    capacity: number; // Số chỗ ngồi

    @Column({ type: 'varchar', default: VehicleStatus.AVAILABLE })
    status: string;

    @Column({ type: 'varchar', nullable: true })
    ai_camera_id: string; // Để Null nếu xe chưa lắp camera

    // Quan hệ: Xe thuộc về 1 Nhà xe
    @ManyToOne(() => Agency)
    @JoinColumn({ name: 'agency_id' })
    agency: Agency;
}