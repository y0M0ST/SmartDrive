"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordController = exports.forgotPasswordController = exports.changePasswordController = exports.logoutController = exports.loginController = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const serviceResponse_1 = require("../../models/serviceResponse");
const authService = __importStar(require("./auth.service"));
exports.loginController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    // Bắt IP và User-Agent để lưu log bảo mật
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await authService.login(req.body, ipAddress, userAgent);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Đăng nhập thành công', result));
});
exports.logoutController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new Error('Thiếu Refresh Token!');
    }
    // Gọi Service để xử lý gạch bỏ phiên đăng nhập
    await authService.logout(refreshToken);
    // Trả về JSON thành công để Frontend yên tâm clear Local Storage và Redirect
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Đăng xuất thành công, hẹn gặp lại!'));
});
exports.changePasswordController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    // GIẢ ĐỊNH: Bồ đã có authMiddleware gắn thông tin giải mã JWT vào req.user
    const userId = req.user.id;
    await authService.changePassword(userId, req.body);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'));
});
exports.forgotPasswordController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    // Dù email sai hay đúng, mình vẫn trả về 1 câu chung chung để chống Hacker dò email hệ thống
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Nếu email hợp lệ, hệ thống đã gửi đường dẫn khôi phục. Vui lòng kiểm tra hộp thư.'));
});
exports.resetPasswordController = (0, catchAsync_1.catchAsync)(async (req, res) => {
    await authService.resetPassword(req.body);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Đặt lại mật khẩu thành công! Giờ bạn có thể đăng nhập.'));
});
//# sourceMappingURL=auth.controller.js.map