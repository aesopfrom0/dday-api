import { Schema } from 'mongoose';

/**
 * Mongoose Plugin: _id를 id로 변환
 *
 * 기능:
 * - toJSON/toObject 시 _id를 id로 자동 변환
 * - __v 필드 제거
 * - virtual 필드로 id 접근 가능
 */
export function idTransformPlugin(schema: Schema) {
  // Virtual 필드로 id 추가
  schema.virtual('id').get(function (this: any) {
    return this._id.toHexString();
  });

  // toJSON 설정
  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });

  // toObject 설정
  schema.set('toObject', {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}
