import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonResult } from 'src/common/dto/result/common';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, CommonResult<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<CommonResult<T>> {
    const http = context.switchToHttp();
    const response = http.getResponse();

    return next.handle().pipe(
      map((data) => {
        let statusCode = response.statusCode;
        // @HttpCode 데코레이터에서 설정된 상태 코드를 읽어옵니다.
        const httpCode = Reflect.getMetadata('httpCode', context.getHandler());
        if (httpCode) {
          statusCode = httpCode;
        }

        return {
          data: data,
          statusCode: statusCode,
        } as CommonResult<T>;
      }),
    );
  }
}
