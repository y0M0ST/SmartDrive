"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckinResult = exports.ViolationType = exports.RouteStatus = exports.TripStatus = exports.VehicleStatus = exports.VehicleType = exports.UserStatus = void 0;
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["BLOCKED"] = "BLOCKED";
    UserStatus["INACTIVE"] = "INACTIVE";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["SLEEPER"] = "SLEEPER";
    VehicleType["SEAT"] = "SEAT";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["AVAILABLE"] = "AVAILABLE";
    VehicleStatus["IN_SERVICE"] = "IN_SERVICE";
    VehicleStatus["MAINTENANCE"] = "MAINTENANCE";
    VehicleStatus["INACTIVE"] = "INACTIVE";
})(VehicleStatus || (exports.VehicleStatus = VehicleStatus = {}));
var TripStatus;
(function (TripStatus) {
    TripStatus["SCHEDULED"] = "SCHEDULED";
    TripStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TripStatus["COMPLETED"] = "COMPLETED";
    TripStatus["CANCELLED"] = "CANCELLED";
})(TripStatus || (exports.TripStatus = TripStatus = {}));
var RouteStatus;
(function (RouteStatus) {
    RouteStatus["ACTIVE"] = "ACTIVE";
    RouteStatus["SUSPENDED"] = "SUSPENDED";
})(RouteStatus || (exports.RouteStatus = RouteStatus = {}));
var ViolationType;
(function (ViolationType) {
    ViolationType["DROWSY"] = "DROWSY";
    ViolationType["DISTRACTED"] = "DISTRACTED";
})(ViolationType || (exports.ViolationType = ViolationType = {}));
var CheckinResult;
(function (CheckinResult) {
    CheckinResult["SUCCESS"] = "SUCCESS";
    CheckinResult["FAILED"] = "FAILED";
    CheckinResult["LOCKED"] = "LOCKED";
})(CheckinResult || (exports.CheckinResult = CheckinResult = {}));
//# sourceMappingURL=enums.js.map