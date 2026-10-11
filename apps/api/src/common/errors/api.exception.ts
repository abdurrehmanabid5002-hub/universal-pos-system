import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@universal-pos/contracts';

export class ApiException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: Record<string, any>
  ) {
    super({ code, message, details }, status);
    this.code = code;
    this.details = details;
  }
}
