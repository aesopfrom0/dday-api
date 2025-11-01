export class CommonResult<T> {
  statusCode: number;
  data: T;
  message?: string;
}
