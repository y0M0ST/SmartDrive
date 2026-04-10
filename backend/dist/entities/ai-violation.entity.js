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
exports.AiViolation = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const trip_entity_1 = require("./trip.entity");
const user_entity_1 = require("./user.entity");
const vehicle_entity_1 = require("./vehicle.entity");
const device_entity_1 = require("./device.entity");
const violation_config_entity_1 = require("./violation-config.entity");
let AiViolation = class AiViolation extends base_entity_1.CoreEntity {
};
exports.AiViolation = AiViolation;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], AiViolation.prototype, "trip_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], AiViolation.prototype, "driver_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], AiViolation.prototype, "vehicle_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AiViolation.prototype, "device_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AiViolation.prototype, "config_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true }),
    __metadata("design:type", String)
], AiViolation.prototype, "device_event_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AiViolation.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], AiViolation.prototype, "image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], AiViolation.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], AiViolation.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], AiViolation.prototype, "occurred_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], AiViolation.prototype, "is_read", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], AiViolation.prototype, "acknowledged_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], AiViolation.prototype, "acknowledged_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'SYNCED' }),
    __metadata("design:type", String)
], AiViolation.prototype, "sync_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], AiViolation.prototype, "synced_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => trip_entity_1.Trip),
    (0, typeorm_1.JoinColumn)({ name: 'trip_id' }),
    __metadata("design:type", trip_entity_1.Trip)
], AiViolation.prototype, "trip", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'driver_id' }),
    __metadata("design:type", user_entity_1.User)
], AiViolation.prototype, "driver", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => vehicle_entity_1.Vehicle),
    (0, typeorm_1.JoinColumn)({ name: 'vehicle_id' }),
    __metadata("design:type", vehicle_entity_1.Vehicle)
], AiViolation.prototype, "vehicle", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => device_entity_1.Device),
    (0, typeorm_1.JoinColumn)({ name: 'device_id' }),
    __metadata("design:type", device_entity_1.Device)
], AiViolation.prototype, "device", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => violation_config_entity_1.ViolationConfig),
    (0, typeorm_1.JoinColumn)({ name: 'config_id' }),
    __metadata("design:type", violation_config_entity_1.ViolationConfig)
], AiViolation.prototype, "config", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'acknowledged_by' }),
    __metadata("design:type", user_entity_1.User)
], AiViolation.prototype, "acknowledger", void 0);
exports.AiViolation = AiViolation = __decorate([
    (0, typeorm_1.Entity)('ai_violations'),
    (0, typeorm_1.Index)(['trip_id', 'occurred_at']),
    (0, typeorm_1.Index)(['driver_id', 'occurred_at']),
    (0, typeorm_1.Index)(['vehicle_id', 'occurred_at']),
    (0, typeorm_1.Index)(['type', 'occurred_at']),
    (0, typeorm_1.Index)(['is_read', 'occurred_at']) // Để Điều phối viên lọc các lỗi chưa đọc
], AiViolation);
//# sourceMappingURL=ai-violation.entity.js.map