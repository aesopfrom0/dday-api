import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * API 성능 모니터링 인터셉터
 *
 * - 모든 요청의 응답 시간 측정
 * - 느린 요청(1초 이상) 경고 로그
 * - CloudWatch에서 "SLOW_REQUEST" 키워드로 필터링 가능
 */
@Injectable()
export class PerformanceLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          // 기본 로그 (모든 요청)
          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms - ${userAgent.substring(0, 50)}`,
          );

          // 느린 요청 경고 (1초 이상)
          if (duration > 1000) {
            this.logger.warn(
              `[SLOW_REQUEST] ${method} ${url} took ${duration}ms - Body: ${JSON.stringify(body)}`,
            );
          }

          // 매우 느린 요청 에러 (3초 이상)
          if (duration > 3000) {
            this.logger.error(
              `[CRITICAL_SLOW] ${method} ${url} took ${duration}ms - Immediate optimization needed!`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} FAILED after ${duration}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
