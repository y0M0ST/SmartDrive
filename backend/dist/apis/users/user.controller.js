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
exports.deleteUser = exports.changeStatus = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const serviceResponse_1 = require("../../models/serviceResponse");
const userService = __importStar(require("./user.service"));
const getActor = (req) => {
    const user = req.user;
    return {
        id: user?.id,
        role: user?.role,
        agency_id: user?.agency_id ?? null,
    };
};
exports.getUsers = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await userService.getUsers(req.query, getActor(req));
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Lấy danh sách thành công', result));
});
exports.createUser = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await userService.createUser(req.body, getActor(req));
    res.status(201).json(serviceResponse_1.ServiceResponse.success('Thêm mới tài khoản thành công', result));
});
exports.updateUser = (0, catchAsync_1.catchAsync)(async (req, res) => {
    await userService.updateUser(req.params.id, req.body, getActor(req));
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Cập nhật thông tin thành công'));
});
exports.changeStatus = (0, catchAsync_1.catchAsync)(async (req, res) => {
    await userService.changeUserStatus(req.params.id, req.body.status, getActor(req));
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Thay đổi trạng thái thành công'));
});
exports.deleteUser = (0, catchAsync_1.catchAsync)(async (req, res) => {
    await userService.deleteUser(req.params.id, getActor(req));
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Đã xóa tài khoản khỏi hệ thống'));
});
//# sourceMappingURL=user.controller.js.map