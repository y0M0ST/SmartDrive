import { AppDataSource } from '../../config/data-source';
import { Agency } from '../../entities/agency.entity';

type AgencySeed = {
    code: string;
    name: string;
    address: string;
    phone: string;
    status: string;
};

const AGENCY_DEFINITIONS: AgencySeed[] = Array.from({ length: 10 }, (_, idx) => {
    const no = idx + 1;
    const code = `AGENCY_${String(no).padStart(2, '0')}`;

    return {
        code,
        name: `Agency ${String(no).padStart(2, '0')}`,
        address: `So ${no} Duong Mau, Thanh pho Ho Chi Minh`,
        phone: `0900000${String(no).padStart(3, '0')}`,
        status: no === 9 ? 'INACTIVE' : 'ACTIVE',
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
