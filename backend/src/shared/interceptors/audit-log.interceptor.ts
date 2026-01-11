import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';
import { Request } from 'express';

interface RequestWithUser extends Request {
    user?: {
        id: string;
        companyId: string;
    };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(private readonly dataSource: DataSource) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const { method, originalUrl, body } = request;

        // Only log state-changing methods
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return next.handle();
        }

        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: async (response) => {
                    try {
                        await this.logAudit({
                            userId: request.user?.id || 'anonymous',
                            companyId: request.user?.companyId || null,
                            action: method,
                            endpoint: originalUrl,
                            requestBody: body,
                            responseData: response,
                            statusCode: 200,
                            duration: Date.now() - startTime,
                        });
                    } catch (error) {
                        console.error('Failed to log audit:', error);
                    }
                },
                error: async (error) => {
                    try {
                        await this.logAudit({
                            userId: request.user?.id || 'anonymous',
                            companyId: request.user?.companyId || null,
                            action: method,
                            endpoint: originalUrl,
                            requestBody: body,
                            responseData: null,
                            statusCode: error.status || 500,
                            errorMessage: error.message,
                            duration: Date.now() - startTime,
                        });
                    } catch (logError) {
                        console.error('Failed to log audit error:', logError);
                    }
                },
            }),
        );
    }

    private async logAudit(data: {
        userId: string;
        companyId: string | null;
        action: string;
        endpoint: string;
        requestBody: any;
        responseData: any;
        statusCode: number;
        errorMessage?: string;
        duration: number;
    }) {
        // Skip logging for health checks, audit, seed, and auth endpoints
        if (
            data.endpoint.includes('/health') ||
            data.endpoint.includes('/audit') ||
            data.endpoint.includes('/seed') ||
            data.endpoint.includes('/auth')
        ) {
            return;
        }

        await this.dataSource.query(
            `INSERT INTO audit_logs 
        (id, user_id, company_id, action, endpoint, request_body, response_data, status_code, error_message, duration_ms, performed_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                data.userId,
                data.companyId,
                data.action,
                data.endpoint,
                JSON.stringify(data.requestBody),
                JSON.stringify(data.responseData),
                data.statusCode,
                data.errorMessage || null,
                data.duration,
            ],
        );
    }
}
