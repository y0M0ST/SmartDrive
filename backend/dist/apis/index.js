"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_route_1 = __importDefault(require("./auth/auth.route"));
const agency_route_1 = __importDefault(require("./agencies/agency.route"));
const user_route_1 = __importDefault(require("./users/user.route"));
const driver_profile_route_1 = __importDefault(require("./driver-profiles/driver-profile.route"));
const vehicle_route_1 = __importDefault(require("./vehicles/vehicle.route"));
const route_route_1 = __importDefault(require("./routes/route.route"));
const province_route_1 = __importDefault(require("./provinces/province.route"));
const router = (0, express_1.Router)();
router.use('/auth', auth_route_1.default);
router.use('/agencies', agency_route_1.default);
router.use('/users', user_route_1.default);
router.use('/users', driver_profile_route_1.default);
router.use('/vehicles', vehicle_route_1.default);
router.use('/routes', route_route_1.default);
router.use('/provinces', province_route_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map