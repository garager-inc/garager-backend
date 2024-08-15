import { WorkshopEntity } from 'src/workshop/workshop.entity';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('available_slot')
export class AvailableSlotEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'start_time', type: 'timestamp', nullable: false })
  start_time: Date;

  @Column({ name: 'final_time', type: 'timestamp', nullable: false })
  final_time: Date;

  @Column({ name: 'workshop_id' })
  workshop_id: number;

  @ManyToOne(() => WorkshopEntity, (workshop) => workshop.availableSlots)
  @JoinColumn([{ name: 'workshop_id', referencedColumnName: 'id' }])
  workshop: WorkshopEntity;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn({
    default: () => 'CURRENT_TIMESTAMP',
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    default: () => 'CURRENT_TIMESTAMP',
    type: 'timestamp with time zone',
    name: 'updated_at',
    update: true,
  })
  updatedAt: Date;
}
