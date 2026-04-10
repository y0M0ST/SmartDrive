"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllSeeders = runAllSeeders;
const agency_seeder_1 = require("./agency.seeder");
const permission_seeder_1 = require("./permission.seeder");
const role_permission_seeder_1 = require("./role-permission.seeder");
const role_seeder_1 = require("./role.seeder");
const user_seeder_1 = require("./user.seeder");
async function runAllSeeders() {
    await (0, role_seeder_1.seedRoles)();
    await (0, permission_seeder_1.seedPermissions)();
    await (0, role_permission_seeder_1.seedRolePermissions)();
    await (0, agency_seeder_1.seedAgencies)();
    await (0, user_seeder_1.seedUsers)();
}
//# sourceMappingURL=index.js.map