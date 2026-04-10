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
exports.TripCheckin = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const trip_entity_1 = require("./trip.entity");
const user_entity_1 = require("./user.entity");
const device_entity_1 = require("./device.entity");
let TripCheckin = class TripCheckin extends base_entity_1.CoreEntity {
};
exports.TripCheckin = TripCheckin;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TripCheckin.prototype, "trip_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TripCheckin.prototype, "driver_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], TripCheckin.prototype, "device_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], TripCheckin.prototype, "match_score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], TripCheckin.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], TripCheckin.prototype, "fail_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], TripCheckin.prototype, "image_url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }),
    __metadata("design:type", Date)
], TripCheckin.prototype, "checked_in_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => trip_entity_1.Trip),
    (0, typeorm_1.JoinColumn)({ name: 'trip_id' }),
    __metadata("design:type", trip_entity_1.Trip)
], TripCheckin.prototype, "trip", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'driver_id' }),
    __metadata("design:type", user_entity_1.User)
], TripCheckin.prototype, "driver", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => device_entity_1.Device),
    (0, typeorm_1.JoinColumn)({ name: 'device_id' }),
    __metadata("design:type", device_entity_1.Device)
], TripCheckin.prototype, "device", void 0);
exports.TripCheckin = TripCheckin = __decorate([
    (0, typeorm_1.Entity)('trip_checkins'),
    (0, typeorm_1.Index)(['trip_id', 'checked_in_at']) // Lọc lịch sử điểm danh của 1 chuyến
    ,
    (0, typeorm_1.Index)(['driver_id', 'checked_in_at']) // Xem tài xế này hôm nay quét mặt mấy lần
], TripCheckin);
//# sourceMappingURL=trip-checkin.entity.js.map