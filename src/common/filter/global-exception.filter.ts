import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorCode } from '../constant/error-codes';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error occurred';
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 메시지 추출
      if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
        message = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message[0]
          : (exceptionResponse.message as string);
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }

      // 에러 코드 자동 생성 (메시지 기반)
      errorCode = this.getErrorCode(exception, message);
    } else {
      // 예상치 못한 에러 로깅
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      errorCode,
      message,
      data: null,
    });
  }

  /**
   * 에러 타입과 메시지를 기반으로 에러 코드 생성
   */
  private getErrorCode(exception: HttpException, message: string): ErrorCode {
    // User 관련
    if (message.includes('User not found')) return ErrorCode.USER_NOT_FOUND;
    if (message.includes('Invalid timezone')) return ErrorCode.USER_INVALID_TIMEZONE;
    if (message.includes('No FCM tokens')) return ErrorCode.USER_NO_FCM_TOKEN;

    // Occasion 관련
    if (message.includes('Occasion not found')) return ErrorCode.OCCASION_NOT_FOUND;
    if (message.includes('permission to access this occasion')) return ErrorCode.OCCASION_FORBIDDEN;
    if (message.includes('can only pin')) return ErrorCode.OCCASION_PIN_LIMIT_EXCEEDED;
    if (message.includes('can only add up to') && message.includes('milestones'))
      return ErrorCode.OCCASION_MILESTONE_LIMIT_EXCEEDED;

    // Milestone 관련
    if (message.includes('Milestone not found')) return ErrorCode.MILESTONE_NOT_FOUND;

    // Auth 관련
    if (message.includes('Invalid Google token')) return ErrorCode.AUTH_INVALID_GOOGLE_TOKEN;
    if (message.includes('Invalid Apple token')) return ErrorCode.AUTH_INVALID_APPLE_TOKEN;
    if (message.includes('Invalid refresh token')) return ErrorCode.AUTH_INVALID_REFRESH_TOKEN;
    if (message.includes('Email is required')) return ErrorCode.AUTH_EMAIL_REQUIRED;
    if (message.includes('Email already registered')) return ErrorCode.AUTH_EMAIL_ALREADY_EXISTS;
    if (message.includes('Dev login only')) return ErrorCode.AUTH_DEV_ONLY;

    // 기본값 (예외 타입 기반)
    if (exception instanceof NotFoundException) return ErrorCode.USER_NOT_FOUND;
    if (exception instanceof ForbiddenException) return ErrorCode.OCCASION_FORBIDDEN;
    if (exception instanceof BadRequestException) return ErrorCode.AUTH_EMAIL_REQUIRED;
    if (exception instanceof UnauthorizedException) return ErrorCode.AUTH_INVALID_GOOGLE_TOKEN;

    return ErrorCode.INTERNAL_SERVER_ERROR;
  }
}
