import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ResponseEnvelope<T> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    [key: string]: any;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ResponseEnvelope<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return next.handle().pipe(
      map((result) => {
        // If result already contains data & meta, return as is
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          return result;
        }

        return {
          data: result,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };
      })
    );
  }
}
