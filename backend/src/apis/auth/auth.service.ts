import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MoreThan, IsNull } from 'typeorm';

import { AppDataSource } from '../../config/data-source';
import { User } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';

import { UserStatus } from '../../common/constants/enums';
import { generateTokens } from '../../utils/jwtHelper';
import { sendResetPasswordEmail } from '../../utils/mailer';

import {
    LoginInput,
    ChangePasswordInput,
    ForgotPasswordInput,
    ResetPasswordInput,
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