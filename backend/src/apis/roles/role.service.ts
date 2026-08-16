import { AppDataSource } from '../../config/data-source';
import { Role } from '../../entities/role.entity';

export const getRoles = async () => {
    const roleRepo = AppDataSource.getRepository(Role);
    const roles = await roleRepo.find({
        order: { name: 'ASC' },
    });

    return roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
    }));
};

