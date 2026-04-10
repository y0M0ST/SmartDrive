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
exports.ViolationConfig = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
let ViolationConfig = class ViolationConfig extends base_entity_1.CoreEntity {
};
exports.ViolationConfig = ViolationConfig;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], ViolationConfig.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ViolationConfig.prototype, "points_to_subtract", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], ViolationConfig.prototype, "effective_from", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], ViolationConfig.prototype, "effective_to", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ViolationConfig.prototype, "is_active", void 0);
exports.ViolationConfig = ViolationConfig = __decorate([
    (0, typeorm_1.Entity)('violation_configs'),
    (0, typeorm_1.Index)(['type', 'effective_from']) // Tìm nhanh config đang áp dụng theo loại lỗi
], ViolationConfig);
//# sourceMappingURL=violation-config.entity.js.map