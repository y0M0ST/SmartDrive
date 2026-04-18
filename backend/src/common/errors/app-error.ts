export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    details?: unknown;

    constructor(message: string, statusCode = 500, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

/** HTTP 400 — tương đương NestJS BadRequestException, dùng chung error handler hiện tại. */
export class BadRequestException extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, details);
        this.name = 'BadRequestException';
    }
}

/** HTTP 409 — tương đương NestJS ConflictException. */
export class ConflictException extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 409, details);
        this.name = 'ConflictException';
    }
}
