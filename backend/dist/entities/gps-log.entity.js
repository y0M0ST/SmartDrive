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
exports.GpsLog = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const trip_entity_1 = require("./trip.entity");
let GpsLog = class GpsLog extends base_entity_1.CoreEntity {
};
exports.GpsLog = GpsLog;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], GpsLog.prototype, "trip_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], GpsLog.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], GpsLog.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], GpsLog.prototype, "speed", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', nullable: true }),
    __metadata("design:type", Number)
], GpsLog.prototype, "heading", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], GpsLog.prototype, "recorded_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => trip_entity_1.Trip),
    (0, typeorm_1.JoinColumn)({ name: 'trip_id' }),
    __metadata("design:type", trip_entity_1.Trip)
], GpsLog.prototype, "trip", void 0);
exports.GpsLog = GpsLog = __decorate([
    (0, typeorm_1.Entity)('gps_logs'),
    (0, typeorm_1.Index)(['trip_id', 'recorded_at']) // Query vẽ đường đi của 1 chuyến
    ,
    (0, typeorm_1.Index)(['recorded_at']) // Dọn dẹp data cũ định kỳ
], GpsLog);
//# sourceMappingURL=gps-log.entity.js.map