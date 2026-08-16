import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export abstract class CoreEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;
}

export abstract class BaseEntity extends CoreEntity {
    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    // Dùng cho Soft Delete (Xóa mềm). 
    @DeleteDateColumn({ type: 'timestamptz', nullable: true })
    deleted_at: Date;
}