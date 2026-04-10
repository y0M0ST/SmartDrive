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
exports.deleteRoute = exports.changeStatus = exports.updateRoute = exports.createRoute = exports.getRoutes = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const serviceResponse_1 = require("../../models/serviceResponse");
const routeService = __importStar(require("./route.service"));
const app_error_1 = require("../../common/errors/app-error");
const getAgencyIdFromRequest = (req) => {
    const user = req.user;
    if (!user?.agency_id) {
        throw new app_error_1.AppError('Ban chua dang nhap hoac token khong hop le.', 401);
    }
    return user.agency_id;
};
exports.getRoutes = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const agencyId = getAgencyIdFromRequest(req);
    const result = await routeService.getRoutes(req.query, agencyId);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Lấy danh sách tuyến đường thành công', result));
});
exports.createRoute = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const agencyId = getAgencyIdFromRequest(req);
    const result = await routeService.createRoute(agencyId, req.body);
    res.status(201).json(serviceResponse_1.ServiceResponse.success('Thêm tuyến đường mới thành công', result));
});
exports.updateRoute = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const agencyId = getAgencyIdFromRequest(req);
    await routeService.updateRoute(agencyId, req.params.id, req.body);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Cập nhật tuyến đường thành công'));
});
exports.changeStatus = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const agencyId = getAgencyIdFromRequest(req);
    await routeService.changeRouteStatus(agencyId, req.params.id, req.body.status);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Thay đổi trạng thái tuyến đường thành công'));
});
exports.deleteRoute = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const agencyId = getAgencyIdFromRequest(req);
    await routeService.deleteRoute(agencyId, req.params.id);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Đã xóa tuyến đường khỏi hệ thống'));
});
//# sourceMappingURL=route.controller.js.map