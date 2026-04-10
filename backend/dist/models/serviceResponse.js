"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceResponse = void 0;
class ServiceResponse {
    constructor(status, message, data = null) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
    // Hàm tiện ích gọi cho lẹ
    static success(message, data = null) {
        return new ServiceResponse('success', message, data);
    }
    static error(message) {
        return new ServiceResponse('error', message, null);
    }
}
exports.ServiceResponse = ServiceResponse;
//# sourceMappingURL=serviceResponse.js.map