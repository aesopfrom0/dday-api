import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { idTransformPlugin } from '../../common/plugins/id-transform.plugin';

export type NotificationQueueDocument = NotificationQueue &
  Document & {
    id: string; // virtual 필드
  };

@Schema({
  collection: 'notification_queues',
  timestamps: true,
})
export class NotificationQueue {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Occasion', required: true })
  occasionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  milestoneId: string; // 마일스톤 존재 확인용

  @Prop({ required: true })
  scheduledFor: Date; // UTC 시간

  @Prop({ required: true, enum: ['3_days', '1_day', 'd_day'] })
  type: '3_days' | '1_day' | 'd_day';

  @Prop({
    required: true,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'sent' | 'failed';

  @Prop()
  sentAt?: Date;

  @Prop()
  failedReason?: string;

  @Prop({ default: 0 })
  retryCount: number;
}

export const NotificationQueueSchema = SchemaFactory.createForClass(NotificationQueue);

// Plugin 적용
NotificationQueueSchema.plugin(idTransformPlugin);

// 인덱스 설정
NotificationQueueSchema.index({ scheduledFor: 1, status: 1 }); // 크론 쿼리용
NotificationQueueSchema.index({ occasionId: 1 }); // 이벤트 수정/삭제 시
NotificationQueueSchema.index({ userId: 1, status: 1 }); // 사용자별 조회
