import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * MongoDB _id를 id로 변환하는 인터셉터
 *
 * 모든 응답에서 _id, __v를 제거하고 id 필드를 추가합니다.
 */
@Injectable()
export class MongoIdTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.transformResponse(data)));
  }

  private transformResponse(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    // 배열인 경우
    if (Array.isArray(data)) {
      return data.map((item) => this.transformResponse(item));
    }

    // 객체인 경우
    if (typeof data === 'object') {
      // Mongoose Document인 경우 toJSON() 호출
      if (data.toJSON && typeof data.toJSON === 'function') {
        data = data.toJSON();
      }

      const transformed: any = {};

      for (const key in data) {
        if (key === '_id') {
          // _id를 id로 변환
          transformed.id = data[key]?.toString() || data[key];
        } else if (key === '__v') {
          // __v는 제거
          continue;
        } else {
          // 중첩된 객체도 재귀적으로 변환
          transformed[key] = this.transformResponse(data[key]);
        }
      }

      return transformed;
    }

    return data;
  }
}
