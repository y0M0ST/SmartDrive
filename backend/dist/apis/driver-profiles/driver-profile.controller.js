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
exports.getProfile = exports.updateProfile = exports.createProfile = void 0;
const catchAsync_1 = require("../../utils/catchAsync");
const serviceResponse_1 = require("../../models/serviceResponse");
const profileService = __importStar(require("./driver-profile.service"));
const app_error_1 = require("../../common/errors/app-error");
const getActor = (req) => {
    const user = req.user;
    return {
        id: user?.id,
        role: user?.role,
        agency_id: user?.agency_id ?? null,
    };
};
exports.createProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const files = req.files;
    const bodyUserId = req.body.user_id;
    if (!bodyUserId) {
        throw new app_error_1.AppError('Thieu user_id trong body.', 400);
    }
    const result = await profileService.createProfile(getActor(req), bodyUserId, req.body, files);
    res.status(201).json(serviceResponse_1.ServiceResponse.success('Da tao ho so tai xe va dong bo du lieu nhan dien', result));
});
exports.updateProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const files = req.files;
    const result = await profileService.updateProfile(getActor(req), req.params.userId, req.body, files);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Da cap nhat ho so tai xe va dong bo du lieu nhan dien', result));
});
exports.getProfile = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await profileService.getProfileInfo(req.params.userId, getActor(req));
    if (!result)
        throw new app_error_1.AppError('Tai xe nay chua co ho so.', 404);
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Lấy hồ sơ thành công', result));
});
//# sourceMappingURL=driver-profile.controller.js.map