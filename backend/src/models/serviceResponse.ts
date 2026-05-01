export class ServiceResponse<T> {
    status: 'success' | 'error';
    message: string;
    data: T | null;

    constructor(status: 'success' | 'error', message: string, data: T | null = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }

    // Hàm tiện ích gọi cho lẹ
    static success<T>(message: string, data: T | null = null) {
        return new ServiceResponse('success', message, data);
    }

    static error(message: string) {
        return new ServiceResponse<null>('error', message, null);
    }
}