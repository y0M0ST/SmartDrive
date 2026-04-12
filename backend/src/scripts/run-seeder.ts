import 'dotenv/config';
import { AppDataSource } from '../config/data-source';
import { runAllSeeders } from './seeders';

async function runSeeder(): Promise<void> {
    try {
        await AppDataSource.initialize();
        console.log('Seeder database connected');

        await runAllSeeders();
        console.log('Seeding completed: roles, permissions, role_permissions');
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exitCode = 1;
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

void runSeeder();
