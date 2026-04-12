import { AppDataSource } from '../../config/data-source';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { DriverImage } from '../../entities/driver-image.entity';
import { CreateProfileInput, UpdateProfileInput } from './driver-profile.dto';
import { AppError } from '../../common/errors/app-error';
import { User } from '../../entities/user.entity';
import { uploadImageBufferToCloudinary } from '../../utils/cloudinary';

type ActorContext = {
    id: string;
    role: string;
    agency_id: string | null;
};

const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    AGENCY_ADMIN: 'AGENCY_ADMIN',
    DISPATCHER: 'DISPATCHER',
    DRIVER: 'DRIVER',
} as const;

function ensureProfileManager(actor: ActorContext): void {
    if (![ROLES.SUPER_ADMIN, ROLES.AGENCY_ADMIN, ROLES.DISPATCHER].includes(actor.role as any)) {
        throw new AppError('Ban khong co quyen quan ly ho so tai xe.', 403);
    }
}

function assertImageCount(files: Express.Multer.File[]): void {
    if (!files) return;
    if (files.length > 3) {
        throw new AppError('Chi duoc upload toi da 3 anh.', 400);
    }
}

async function generateUniqueDriverCode(agencyId: string): Promise<string> {
    const profileRepo = AppDataSource.getRepository(DriverProfile);
    for (let i = 0; i < 10; i += 1) {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const code = `TX-${randomNum}`;
        const exists = await profileRepo.findOne({
            where: { agency_id: agencyId, driver_code: code },
        });
        if (!exists) return code;
    }
    throw new AppError('Khong the sinh ma tai xe duy nhat. Vui long thu lai.', 500);
}

async function findAndAuthorizeTargetDriver(
    actor: ActorContext,
    userId: string,
): Promise<User> {
    const userRepo = AppDataSource.getRepository(User);
    const targetUser = await userRepo.findOne({
        where: { id: userId },
        relations: ['role'],
    });
    if (!targetUser) {
        throw new AppError('Khong tim thay tai khoan tai xe.', 404);
    }
    if (targetUser.role?.name !== ROLES.DRIVER) {
        throw new AppError('Chi duoc tao/cap nhat ho so cho role DRIVER.', 400);
    }
    if (
        actor.role !== ROLES.SUPER_ADMIN &&
        targetUser.agency_id !== actor.agency_id
    ) {
        throw new AppError('Khong duoc thao tac ho so ngoai agency cua ban.', 403);
    }
    return targetUser;
}

async function replaceProfileImages(
    profileId: string,
    files: Express.Multer.File[],
) {
    const imageRepo = AppDataSource.getRepository(DriverImage);
    assertImageCount(files || []);
    if (!files || files.length === 0) {
        throw new AppError('Bat buoc upload it nhat 1 anh khuon mat.', 400);
    }

    const uploadedUrls: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const imageUrl = await uploadImageBufferToCloudinary(
            file.buffer,
            'smartdrive/driver-faces',
        );
        uploadedUrls.push(imageUrl);
    }

    await imageRepo.delete({ profile_id: profileId });

    for (let i = 0; i < uploadedUrls.length; i += 1) {
        const newImage = imageRepo.create({
            profile_id: profileId,
            image_url: uploadedUrls[i],
            is_primary: i === 0,
        });
        await imageRepo.save(newImage);
    }

    return imageRepo.find({
        where: { profile_id: profileId },
        order: { created_at: 'ASC' },
    });
}

export const createProfile = async (
    actor: ActorContext,
    userId: string,
    input: CreateProfileInput,
    files: Express.Multer.File[],
) => {
    ensureProfileManager(actor);
    if (actor.role !== ROLES.SUPER_ADMIN && !actor.agency_id) {
        throw new AppError('Tai khoan khong co agency hop le.', 403);
    }

    const profileRepo = AppDataSource.getRepository(DriverProfile);
    const targetUser = await findAndAuthorizeTargetDriver(actor, userId);

    const existingProfile = await profileRepo.findOneBy({ user_id: userId });
    if (existingProfile) {
        throw new AppError(
            'Tai xe da co ho so. Vui long dung API cap nhat.',
            409,
        );
    }

    const agencyId = targetUser.agency_id;
    if (!agencyId) {
        throw new AppError('Tai khoan driver bat buoc thuoc mot agency.', 400);
    }

    const profile = profileRepo.create({
        user_id: userId,
        id_card: input.id_card,
        license_class: input.license_class,
        license_expires_at: input.license_expires_at,
        agency_id: agencyId,
        driver_code: await generateUniqueDriverCode(agencyId),
    });
    await profileRepo.save(profile);

    let images: DriverImage[] = [];
    try {
        images = await replaceProfileImages(profile.id, files);
    } catch (error) {
        await profileRepo.delete({ id: profile.id });
        throw error;
    }
    console.log(`[AI Pipeline] enqueue extract face encoding for profile_id=${profile.id}`);

    return { ...profile, images };
};

export const updateProfile = async (
    actor: ActorContext,
    userId: string,
    input: UpdateProfileInput,
    files: Express.Multer.File[],
) => {
    ensureProfileManager(actor);
    if (actor.role !== ROLES.SUPER_ADMIN && !actor.agency_id) {
        throw new AppError('Tai khoan khong co agency hop le.', 403);
    }

    const profileRepo = AppDataSource.getRepository(DriverProfile);
    const imageRepo = AppDataSource.getRepository(DriverImage);

    const targetUser = await findAndAuthorizeTargetDriver(actor, userId);
    const profile = await profileRepo.findOneBy({ user_id: targetUser.id });
    if (!profile) {
        throw new AppError('Tai xe chua co ho so. Vui long tao moi truoc.', 404);
    }
    if (actor.role !== ROLES.SUPER_ADMIN && profile.agency_id !== actor.agency_id) {
        throw new AppError('Khong duoc cap nhat ho so tai xe ngoai agency.', 403);
    }

    // user_id + driver_code la immutable: khong cho sua o API nay
    profile.id_card = input.id_card;
    profile.license_class = input.license_class;
    profile.license_expires_at = input.license_expires_at;
    await profileRepo.save(profile);

    let images = await imageRepo.find({
        where: { profile_id: profile.id },
        order: { created_at: 'ASC' },
    });

    // Replace full image set when new files are provided
    if (files && files.length > 0) {
        images = await replaceProfileImages(profile.id, files);
    }

    if (images.length === 0) {
        throw new AppError(
            'Ho so tai xe phai co it nhat 1 anh. Vui long upload anh.',
            400,
        );
    }
    if (images.length > 3) {
        throw new AppError('Ho so tai xe chi duoc luu toi da 3 anh.', 400);
    }

    console.log(`[AI Pipeline] enqueue refresh face encoding for profile_id=${profile.id}`);
    return { ...profile, images };
};

export const getProfileInfo = async (userId: string, actor: ActorContext) => {
    ensureProfileManager(actor);
    const profileRepo = AppDataSource.getRepository(DriverProfile);
    const imageRepo = AppDataSource.getRepository(DriverImage);

    const profile = await profileRepo.findOne({
        where: { user_id: userId },
    });
    if (!profile) return null;

    if (actor.role !== ROLES.SUPER_ADMIN && profile.agency_id !== actor.agency_id) {
        throw new AppError('Ban khong co quyen xem ho so ngoai agency.', 403);
    }

    const images = await imageRepo.find({
        where: { profile_id: profile.id },
        order: { created_at: 'ASC' },
    });

    const today = new Date();
    const expiresAt = new Date(profile.license_expires_at);
    const daysLeft = Math.ceil(
        (expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let warning_status = 'SAFE';
    if (daysLeft < 0) warning_status = 'EXPIRED';
    else if (daysLeft <= 30) warning_status = 'EXPIRING_SOON';

    return { ...profile, images, warning_status, days_left: daysLeft };
};