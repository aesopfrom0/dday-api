import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeletionLogDocument = DeletionLog & Document;

/**
 * 계정 탈퇴 로그
 *
 * 목적:
 * - 재가입 방지 (어뷰징 방지)
 * - 법적 분쟁 대비
 * - 통계 및 감사 추적
 *
 * 개인정보보호:
 * - 이메일은 SHA-256 해시로 저장 (복호화 불가)
 * - 최소한의 정보만 보관
 */
@Schema({ timestamps: true, collection: 'deletion_logs' })
export class DeletionLog {
  @Prop({ required: true })
  userId: string; // 삭제된 사용자 ID

  @Prop({ required: true, index: true })
  emailHash: string; // SHA-256 해시 처리된 이메일

  @Prop({ required: true })
  deletedAt: Date; // 탈퇴 일시

  @Prop()
  reason?: string; // 탈퇴 사유 (선택)
}

export const DeletionLogSchema = SchemaFactory.createForClass(DeletionLog);

// 인덱스 설정
DeletionLogSchema.index({ emailHash: 1 });
DeletionLogSchema.index({ deletedAt: 1 });
