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
exports.Route = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base/base.entity");
const agency_entity_1 = require("./agency.entity");
const enums_1 = require("../common/constants/enums");
let Route = class Route extends base_entity_1.BaseEntity {
};
exports.Route = Route;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Route.prototype, "agency_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Route.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Route.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Route.prototype, "start_point", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Route.prototype, "end_point", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Route.prototype, "distance_km", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float' }),
    __metadata("design:type", Number)
], Route.prototype, "estimated_hours", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: enums_1.RouteStatus.ACTIVE }),
    __metadata("design:type", String)
], Route.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => agency_entity_1.Agency),
    (0, typeorm_1.JoinColumn)({ name: 'agency_id' }),
    __metadata("design:type", agency_entity_1.Agency)
], Route.prototype, "agency", void 0);
exports.Route = Route = __decorate([
    (0, typeorm_1.Entity)('routes'),
    (0, typeorm_1.Index)(['agency_id', 'code'], { unique: true }) // Mã tuyến nội bộ không được trùng trong 1 nhà xe
    ,
    (0, typeorm_1.Index)('uq_routes_agency_name_start_end_active', ['agency_id', 'name', 'start_point', 'end_point'], {
        unique: true,
        where: '"deleted_at" IS NULL',
    }) // Cùng nhà xe không trùng bộ (tên + điểm đi + điểm đến) trên bản ghi đang hoạt động
    ,
    (0, typeorm_1.Index)(['agency_id', 'status']) // Lọc các tuyến theo trạng thái
], Route);
//# sourceMappingURL=route.entity.js.map