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
exports.changeAgencyStatus = exports.updateAgency = exports.createAgency = exports.getAgencies = void 0;
const serviceResponse_1 = require("../../models/serviceResponse");
const catchAsync_1 = require("../../utils/catchAsync");
const agencyService = __importStar(require("./agency.service"));
const getActor = (req) => {
    const user = req.user;
    return {
        id: user?.id,
        role: user?.role,
        agency_id: user?.agency_id ?? null,
    };
};
exports.getAgencies = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await agencyService.getAgencies(req.query, getActor(req));
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Lay danh sach nha xe thanh cong', result));
});
exports.createAgency = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const result = await agencyService.createAgency(req.body, getActor(req));
    res.status(201).json(serviceResponse_1.ServiceResponse.success('Tao nha xe thanh cong', result));
});
exports.updateAgency = (0, catchAsync_1.catchAsync)(async (req, res) => {
    await agencyService.updateAgency(req.params.id, req.body, getActor(req));
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Cap nhat nha xe thanh cong'));
});
exports.changeAgencyStatus = (0, catchAsync_1.catchAsync)(async (req, res) => {
    await agencyService.changeAgencyStatus(req.params.id, req.body.status, getActor(req));
    res.status(200).json(serviceResponse_1.ServiceResponse.success('Thay doi trang thai nha xe thanh cong'));
});
//# sourceMappingURL=agency.controller.js.map