import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';

/** Số nhà xe seed (đồng bộ với `user.seeder.ts`). */
export const SEED_AGENCY_COUNT = 15;

type AgencySeed = {
    code: string;
    name: string;
    address: string;
    phone: string;
    status: string;
};

const AGENCY_DEFINITIONS: AgencySeed[] = Array.from({ length: SEED_AGENCY_COUNT }, (_, idx) => {
    const no = idx + 1;
    const suffix = String(no).padStart(2, '0');
    const code = `AGENCY_${suffix}`;

    return {
        code,
        name: `Nhà xe ${suffix}`,
        address: `Số ${no} Đường Trần Hưng Đạo, TP.HCM`,
        phone: `02838${String(no).padStart(6, '0')}`.slice(0, 11),
        /** Một nhà xe INACTIVE để test lọc / trạng thái đại lý. */
        status: no === SEED_AGENCY_COUNT ? 'INACTIVE' : 'ACTIVE',
    };
});

export async function seedAgencies(): Promise<void> {
    const agencyRepo = AppDataSource.getRepository(Agency);

    for (const agencyDef of AGENCY_DEFINITIONS) {
        const existing = await agencyRepo.findOne({
            where: { code: agencyDef.code },
        });

        if (existing) {
            existing.name = agencyDef.name;
            existing.address = agencyDef.address;
            existing.phone = agencyDef.phone;
            existing.status = agencyDef.status;
            await agencyRepo.save(existing);
            continue;
        }

        const agency = agencyRepo.create(agencyDef);
        await agencyRepo.save(agency);
    }
}
