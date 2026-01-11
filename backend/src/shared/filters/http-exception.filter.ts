import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : 'Internal server error';

        this.logger.error(
            `Http Status: ${status} Error Message: ${JSON.stringify(message)}`,
        );

        // Log full error details for non-HttpExceptions
        if (!(exception instanceof HttpException)) {
            this.logger.error('Full exception:', exception);
            if (exception instanceof Error) {
                this.logger.error('Stack trace:', exception.stack);
            }
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message: typeof message === 'object' ? (message as any).message || message : message,
        });
    }
}
