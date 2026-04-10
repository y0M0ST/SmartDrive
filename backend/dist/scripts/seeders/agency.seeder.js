"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAgencies = seedAgencies;
const data_source_1 = require("../../config/data-source");
const agency_entity_1 = require("../../entities/agency.entity");
const AGENCY_DEFINITIONS = Array.from({ length: 10 }, (_, idx) => {
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
async function seedAgencies() {
    const agencyRepo = data_source_1.AppDataSource.getRepository(agency_entity_1.Agency);
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
//# sourceMappingURL=agency.seeder.js.map