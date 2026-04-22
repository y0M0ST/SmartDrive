import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';
import { SalaryConfig } from '../../entities/salary-config.entity';

/** Mẫu US_17: 5.000.000đ lương cứng, 50k/chuyến, 20k/điểm trừ. */
const SAMPLE = {
    base_salary: 5_000_000,
    bonus_per_trip: 50_000,
    penalty_per_point: 20_000,
};

export async function seedSalaryConfigs(): Promise<void> {
    const agencyRepo = AppDataSource.getRepository(Agency);
    const salaryRepo = AppDataSource.getRepository(SalaryConfig);

    const agencies = await agencyRepo.find();
    for (const agency of agencies) {
        const existing = await salaryRepo.findOne({ where: { agency_id: agency.id } });
        if (existing) {
            existing.base_salary = SAMPLE.base_salary;
            existing.bonus_per_trip = SAMPLE.bonus_per_trip;
            existing.penalty_per_point = SAMPLE.penalty_per_point;
            await salaryRepo.save(existing);
            continue;
        }
        await salaryRepo.save(
            salaryRepo.create({
                agency_id: agency.id,
                base_salary: SAMPLE.base_salary,
                bonus_per_trip: SAMPLE.bonus_per_trip,
                penalty_per_point: SAMPLE.penalty_per_point,
            }),
        );
    }
}
