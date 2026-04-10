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
exports.DriverProfile = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const user_entity_1 = require("./user.entity");
const agency_entity_1 = require("./agency.entity");
let DriverProfile = class DriverProfile extends base_entity_1.BaseEntity {
};
exports.DriverProfile = DriverProfile;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DriverProfile.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DriverProfile.prototype, "agency_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DriverProfile.prototype, "driver_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DriverProfile.prototype, "id_card", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DriverProfile.prototype, "license_class", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }) // Type 'date' trong Postgres chỉ lưu YYYY-MM-DD
    ,
    __metadata("design:type", Date)
], DriverProfile.prototype, "license_expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DriverProfile.prototype, "face_encoding", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], DriverProfile.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agency_entity_1.Agency),
    (0, typeorm_1.JoinColumn)({ name: 'agency_id' }),
    __metadata("design:type", agency_entity_1.Agency)
], DriverProfile.prototype, "agency", void 0);
exports.DriverProfile = DriverProfile = __decorate([
    (0, typeorm_1.Entity)('driver_profiles'),
    (0, typeorm_1.Index)(['agency_id', 'driver_code'], { unique: true }) // Không cho phép trùng mã tài xế trong 1 nhà xe
    ,
    (0, typeorm_1.Index)(['agency_id', 'id_card'], { unique: true }) // Không cho phép trùng CMND/CCCD trong 1 nhà xe
], DriverProfile);
//# sourceMappingURL=driver-profile.entity.js.map