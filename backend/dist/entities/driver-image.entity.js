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
exports.DriverImage = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const driver_profile_entity_1 = require("./driver-profile.entity");
let DriverImage = class DriverImage extends base_entity_1.CoreEntity {
};
exports.DriverImage = DriverImage;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], DriverImage.prototype, "profile_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], DriverImage.prototype, "image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DriverImage.prototype, "is_primary", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], DriverImage.prototype, "face_quality_score", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => driver_profile_entity_1.DriverProfile),
    (0, typeorm_1.JoinColumn)({ name: 'profile_id' }),
    __metadata("design:type", driver_profile_entity_1.DriverProfile)
], DriverImage.prototype, "profile", void 0);
exports.DriverImage = DriverImage = __decorate([
    (0, typeorm_1.Entity)('driver_images'),
    (0, typeorm_1.Index)(['profile_id', 'created_at']) // Hỗ trợ sort ảnh mới nhất cực nhanh
], DriverImage);
//# sourceMappingURL=driver-image.entity.js.map