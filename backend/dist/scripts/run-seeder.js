"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const data_source_1 = require("../config/data-source");
const seeders_1 = require("./seeders");
async function runSeeder() {
    try {
        await data_source_1.AppDataSource.initialize();
        console.log('Seeder database connected');
        await (0, seeders_1.runAllSeeders)();
        console.log('Seeding completed: roles, permissions, role_permissions');
    }
    catch (error) {
        console.error('Seeding failed:', error);
        process.exitCode = 1;
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
        }
    }
}
void runSeeder();
//# sourceMappingURL=run-seeder.js.map