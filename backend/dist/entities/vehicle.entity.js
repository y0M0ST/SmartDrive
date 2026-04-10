"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vehicle = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const agency_entity_1 = require("./agency.entity");
const enums_1 = require("../common/constants/enums"); // Kéo Enum vào xài
let Vehicle = class Vehicle extends base_entity_1.BaseEntity {
};
exports.Vehicle = Vehicle;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Vehicle.prototype, "agency_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Vehicle.prototype, "license_plate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: enums_1.VehicleType.SEAT }),
    __metadata("design:type", String)
], Vehicle.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], Vehicle.prototype, "capacity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: enums_1.VehicleStatus.AVAILABLE }),
    __metadata("design:type", String)
], Vehicle.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Vehicle.prototype, "ai_camera_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agency_entity_1.Agency),
    (0, typeorm_1.JoinColumn)({ name: 'agency_id' }),
    __metadata("design:type", agency_entity_1.Agency)
], Vehicle.prototype, "agency", void 0);
exports.Vehicle = Vehicle = __decorate([
    (0, typeorm_1.Entity)('vehicles'),
    (0, typeorm_1.Index)('uq_vehicles_agency_plate_active', ['agency_id', 'license_plate'], {
        unique: true,
        where: '"deleted_at" IS NULL',
    }) // 1 nhà xe không có 2 xe trùng biển số đang hoạt động
    ,
    (0, typeorm_1.Index)('uq_vehicles_agency_camera_active', ['agency_id', 'ai_camera_id'], {
        unique: true,
        where: '"deleted_at" IS NULL AND "ai_camera_id" IS NOT NULL',
    }) // 1 nhà xe không gắn 1 camera cho 2 xe đang hoạt động
    ,
    (0, typeorm_1.Index)(['agency_id', 'status']) // Tìm xe đang rảnh siêu lẹ
], Vehicle);
//# sourceMappingURL=vehicle.entity.js.map