import { Entity, CreateDateColumn, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission {
    @PrimaryColumn({ type: 'uuid' })
    role_id: string;

    @PrimaryColumn({ type: 'uuid' })
    permission_id: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @ManyToOne(() => Permission)
    @JoinColumn({ name: 'permission_id' })
    permission: Permission;
}