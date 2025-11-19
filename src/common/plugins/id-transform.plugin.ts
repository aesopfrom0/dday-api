import { Schema, Types } from 'mongoose';

/**
 * Mongoose Plugin: _id를 id로 변환 및 ObjectId 필드 문자열화
 *
 * 기능:
 * - toJSON/toObject 시 _id를 id로 자동 변환
 * - ObjectId 타입 필드를 문자열로 변환 (userId 등 관계 필드)
 * - __v 필드 제거
 * - virtual 필드로 id 접근 가능
 */
export function idTransformPlugin(schema: Schema) {
  // Virtual 필드로 id 추가
  schema.virtual('id').get(function (this: any) {
    return this._id.toHexString();
  });

  // ObjectId를 문자열로 변환하는 함수
  const transformObjectIds = (ret: any) => {
    Object.keys(ret).forEach((key) => {
      // ObjectId 타입인 경우 문자열로 변환
      if (ret[key] instanceof Types.ObjectId) {
        ret[key] = ret[key].toString();
      }
      // 배열 안의 ObjectId도 변환
      else if (Array.isArray(ret[key])) {
        ret[key] = ret[key].map((item: any) =>
          item instanceof Types.ObjectId ? item.toString() : item,
        );
      }
    });
  };

  // toJSON 설정
  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      transformObjectIds(ret);
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
      transformObjectIds(ret);
      return ret;
    },
  });
}
