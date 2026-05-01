import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MoreThan, IsNull } from 'typeorm';

import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { ProfileContactChangeOtp } from '../../entities/profile-contact-change-otp.entity';

import { UserStatus } from '../../common/constants/enums';
import { AppError } from '../../common/errors/app-error';
import { generateTokens } from '../../utils/jwtHelper';
import { sendResetPasswordEmail, sendProfileContactChangeOtpEmail } from '../../utils/mailer';
import { assertUniqueEmailPhoneByAgency } from '../users/user.service';

import {
    LoginInput,
    ChangePasswordInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    PatchMeProfileInput,
    ContactChangeRequestInput,
    ContactChangeVerifyInput,
} from './auth.dto';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

// ==========================================
// 1. LOGIN
// ==========================================
export const login = async (
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
) => {
    const userRepository = AppDataSource.getRepository(User);
    const sessionRepository = AppDataSource.getRepository(UserSession);

    const user = await userRepository.findOne({
        where: { email: input.email },
        relations: ['role'],
    });

    if (!user) {
        throw new Error('Email hoặc mật khẩu không chính xác');
    }

    if (user.status !== UserStatus.ACTIVE) {
        throw new Error('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin');
    }

    const isPasswordMatch = await bcrypt.compare(
        input.password,
        user.password_hash
    );

    if (!isPasswordMatch) {
        throw new Error('Email hoặc mật khẩu không chính xác');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const session = sessionRepository.create({
        user_id: user.id,
        refresh_token_hash: 'PENDING',
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
    });
    const savedSession = await sessionRepository.save(session);

    const { accessToken, refreshToken } = generateTokens({
        id: user.id,
        agency_id: user.agency_id,
        role: user.role.name,
        sid: savedSession.id,
    });

    savedSession.refresh_token_hash = await bcrypt.hash(refreshToken, 10);
    await sessionRepository.save(savedSession);

    user.last_login_at = new Date();
    await userRepository.save(user);

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role.name,
            agency_id: user.agency_id,
        },
    };
};

// ==========================================
// 2. LOGOUT
// ==========================================
export const logout = async (refreshToken: string) => {
    const sessionRepository = AppDataSource.getRepository(UserSession);

    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
        const userId = decoded.id;
        const sessionId = decoded.sid as string | undefined;
        if (!sessionId) {
            return true;
        }

        const session = await sessionRepository.findOne({
            where: {
                id: sessionId,
                user_id: userId,
                revoked_at: IsNull(),
                expires_at: MoreThan(new Date()),
            },
        });

        if (!session) return true;

        const isMatch = await bcrypt.compare(
            refreshToken,
            session.refresh_token_hash
        );
        if (!isMatch) return true;

        session.revoked_at = new Date();
        await sessionRepository.save(session);

        return true;
    } catch {
        return true;
    }
};

// ==========================================
// 3. ĐỔI MẬT KHẨU (ĐANG ĐĂNG NHẬP)
// ==========================================
export const changePassword = async (
    userId: string,
    input: ChangePasswordInput
) => {
    const userRepository = AppDataSource.getRepository(User);
    const sessionRepository = AppDataSource.getRepository(UserSession);

    const user = await userRepository.findOneBy({ id: userId });
    if (!user) throw new Error('Không tìm thấy người dùng');

    const isMatch = await bcrypt.compare(
        input.oldPassword,
        user.password_hash
    );

    if (!isMatch) {
        throw new Error('Mật khẩu hiện tại không chính xác');
    }

    user.password_hash = await bcrypt.hash(input.newPassword, 10);
    await userRepository.save(user);

    await sessionRepository.update(
        { user_id: userId },
        { revoked_at: new Date() }
    );

    return true;
};

// ==========================================
// 4. QUÊN MẬT KHẨU
// ==========================================
export const forgotPassword = async (input: ForgotPasswordInput) => {
    const userRepository = AppDataSource.getRepository(User);
    const tokenRepository = AppDataSource.getRepository(PasswordResetToken);

    const user = await userRepository.findOneBy({ email: input.email });
    if (!user) {
        throw new Error(
            'Email này không tồn tại trong hệ thống. Vui lòng liên hệ Quản trị viên'
        );
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const resetToken = tokenRepository.create({
        user_id: user.id,
        token_hash: hashedToken,
        expires_at: expiresAt,
    });

    await tokenRepository.save(resetToken);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

    await sendResetPasswordEmail(
        user.email,
        user.full_name,
        resetLink
    );

    return true;
};

// ==========================================
// 5. RESET MẬT KHẨU
// ==========================================
export const resetPassword = async (input: ResetPasswordInput) => {
    const userRepository = AppDataSource.getRepository(User);
    const tokenRepository = AppDataSource.getRepository(PasswordResetToken);
    const sessionRepository = AppDataSource.getRepository(UserSession);

    const hashedToken = crypto
        .createHash('sha256')
        .update(input.token)
        .digest('hex');

    const resetRecord = await tokenRepository.findOne({
        where: {
            token_hash: hashedToken,
            used_at: IsNull(),
            expires_at: MoreThan(new Date()),
        },
    });

    if (!resetRecord) {
        throw new Error(
            'Đường dẫn đã hết hạn (quá 15 phút) hoặc không hợp lệ, vui lòng yêu cầu gửi lại'
        );
    }

    const user = await userRepository.findOneBy({
        id: resetRecord.user_id,
    });

    if (user) {
        user.password_hash = await bcrypt.hash(input.newPassword, 10);
        await userRepository.save(user);
    }

    resetRecord.used_at = new Date();
    await tokenRepository.save(resetRecord);

    await sessionRepository.update(
        { user_id: resetRecord.user_id },
        { revoked_at: new Date() }
    );

    return true;
};

// ==========================================
// 6. PROFILE (ME) — đọc / cập nhật tên / đổi email-SĐT qua OTP
// ==========================================

const CONTACT_OTP_COOLDOWN_MS = 45_000;
const CONTACT_OTP_TTL_MINUTES = 15;

function hashProfileOtp(userId: string, kind: string, code: string): string {
    const pepper = process.env.JWT_SECRET || 'smartdrive-profile-otp';
    return crypto.createHash('sha256').update(`${pepper}:${userId}:${kind}:${code}`).digest('hex');
}

function generateSixDigitOtp(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export const getMe = async (userId: string) => {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
    });
    if (!user) throw new AppError('Không tìm thấy người dùng.', 404);
    return {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        agency_id: user.agency_id,
    };
};

export const updateMyProfile = async (userId: string, input: PatchMeProfileInput) => {
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });
    if (!user) throw new AppError('Không tìm thấy người dùng.', 404);
    user.full_name = input.full_name.trim();
    await userRepository.save(user);
    return { full_name: user.full_name };
};

export const requestProfileContactChange = async (
    userId: string,
    input: ContactChangeRequestInput,
) => {
    const userRepository = AppDataSource.getRepository(User);
    const otpRepository = AppDataSource.getRepository(ProfileContactChangeOtp);

    const user = await userRepository.findOneBy({ id: userId });
    if (!user) throw new AppError('Không tìm thấy người dùng.', 404);

    const kind = input.kind;
    const newValue = kind === 'EMAIL' ? input.newEmail.trim().toLowerCase() : input.newPhone.trim();

    if (kind === 'EMAIL' && newValue === user.email.toLowerCase()) {
        throw new AppError('Email mới trùng với email hiện tại.', 400);
    }
    if (kind === 'PHONE' && newValue === user.phone) {
        throw new AppError('Số điện thoại mới trùng với số hiện tại.', 400);
    }

    await assertUniqueEmailPhoneByAgency(
        user.agency_id ?? null,
        kind === 'EMAIL' ? newValue : undefined,
        kind === 'PHONE' ? newValue : undefined,
        userId,
    );

    const last = await otpRepository.findOne({
        where: { user_id: userId, kind },
        order: { created_at: 'DESC' },
    });
    if (last) {
        const elapsed = Date.now() - new Date(last.created_at).getTime();
        if (elapsed < CONTACT_OTP_COOLDOWN_MS) {
            const waitSec = Math.ceil((CONTACT_OTP_COOLDOWN_MS - elapsed) / 1000);
            throw new AppError(`Vui lòng chờ ${waitSec}s trước khi gửi mã lại.`, 429);
        }
    }

    await otpRepository
        .createQueryBuilder()
        .delete()
        .from(ProfileContactChangeOtp)
        .where('user_id = :uid AND kind = :kind AND used_at IS NULL', { uid: userId, kind })
        .execute();

    const rawOtp = generateSixDigitOtp();
    const otpHash = hashProfileOtp(userId, kind, rawOtp);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CONTACT_OTP_TTL_MINUTES);

    const row = otpRepository.create({
        user_id: userId,
        kind,
        new_value: newValue,
        otp_hash: otpHash,
        expires_at: expiresAt,
        used_at: null,
    });
    await otpRepository.save(row);

    const mailTo = kind === 'EMAIL' ? newValue : user.email;
    const mailKind = kind === 'EMAIL' ? ('email' as const) : ('phone' as const);

    try {
        await sendProfileContactChangeOtpEmail(
            mailTo,
            user.full_name,
            rawOtp,
            mailKind,
            newValue,
        );
    } catch {
        await otpRepository.delete({ id: row.id });
        throw new AppError('Không gửi được email mã xác nhận. Vui lòng kiểm tra cấu hình SMTP.', 500);
    }

    return {
        message: 'Đã gửi mã xác nhận.',
        sentToMasked: kind === 'PHONE' ? maskEmail(user.email) : maskEmail(newValue),
        expiresInMinutes: CONTACT_OTP_TTL_MINUTES,
    };
};

function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const keep = Math.min(2, local.length);
    return `${local.slice(0, keep)}***@${domain}`;
}

export const verifyProfileContactChange = async (
    userId: string,
    input: ContactChangeVerifyInput,
) => {
    const otpRepository = AppDataSource.getRepository(ProfileContactChangeOtp);
    const userRepository = AppDataSource.getRepository(User);
    const now = new Date();

    const record = await otpRepository.findOne({
        where: {
            user_id: userId,
            kind: input.kind,
            used_at: IsNull(),
            expires_at: MoreThan(now),
        },
        order: { created_at: 'DESC' },
    });

    if (!record) {
        throw new AppError('Mã không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại.', 400);
    }

    const tryHash = hashProfileOtp(userId, input.kind, input.otp);
    if (tryHash !== record.otp_hash) {
        throw new AppError('Mã OTP không chính xác.', 400);
    }

    const user = await userRepository.findOneBy({ id: userId });
    if (!user) throw new AppError('Không tìm thấy người dùng.', 404);

    await assertUniqueEmailPhoneByAgency(
        user.agency_id ?? null,
        input.kind === 'EMAIL' ? record.new_value : undefined,
        input.kind === 'PHONE' ? record.new_value : undefined,
        userId,
    );

    if (input.kind === 'EMAIL') {
        user.email = record.new_value;
    } else {
        user.phone = record.new_value;
    }
    await userRepository.save(user);

    record.used_at = now;
    await otpRepository.save(record);

    await otpRepository
        .createQueryBuilder()
        .delete()
        .from(ProfileContactChangeOtp)
        .where('user_id = :uid AND kind = :kind AND used_at IS NULL', { uid: userId, kind: input.kind })
        .execute();

    return {
        email: user.email,
        phone: user.phone,
    };
};