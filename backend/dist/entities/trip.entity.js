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
exports.Trip = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const agency_entity_1 = require("./agency.entity");
const route_entity_1 = require("./route.entity");
const vehicle_entity_1 = require("./vehicle.entity");
const user_entity_1 = require("./user.entity");
const enums_1 = require("../common/constants/enums");
let Trip = class Trip extends base_entity_1.BaseEntity {
};
exports.Trip = Trip;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Trip.prototype, "agency_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true }),
    __metadata("design:type", String)
], Trip.prototype, "trip_code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Trip.prototype, "route_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Trip.prototype, "vehicle_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Trip.prototype, "driver_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Trip.prototype, "departure_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Trip.prototype, "planned_end_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Trip.prototype, "actual_start_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Trip.prototype, "actual_end_time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: enums_1.TripStatus.SCHEDULED }),
    __metadata("design:type", String)
], Trip.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Trip.prototype, "cancel_reason", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agency_entity_1.Agency),
    (0, typeorm_1.JoinColumn)({ name: 'agency_id' }),
    __metadata("design:type", agency_entity_1.Agency)
], Trip.prototype, "agency", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => route_entity_1.Route),
    (0, typeorm_1.JoinColumn)({ name: 'route_id' }),
    __metadata("design:type", route_entity_1.Route)
], Trip.prototype, "route", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => vehicle_entity_1.Vehicle),
    (0, typeorm_1.JoinColumn)({ name: 'vehicle_id' }),
    __metadata("design:type", vehicle_entity_1.Vehicle)
], Trip.prototype, "vehicle", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'driver_id' }),
    __metadata("design:type", user_entity_1.User)
], Trip.prototype, "driver", void 0);
exports.Trip = Trip = __decorate([
    (0, typeorm_1.Entity)('trips'),
    (0, typeorm_1.Index)(['driver_id', 'departure_time']) // Để check xem tài xế có đang kẹt lịch chuyến khác không
    ,
    (0, typeorm_1.Index)(['vehicle_id', 'departure_time']) // Để check xem xe có đang kẹt lịch không
    ,
    (0, typeorm_1.Index)(['agency_id', 'status', 'departure_time']) // Dùng cho màn hình Dashboard của Điều phối viên
], Trip);
//# sourceMappingURL=trip.entity.js.map