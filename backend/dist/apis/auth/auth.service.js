"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProfileContactChange = exports.requestProfileContactChange = exports.updateMyProfile = exports.getMe = exports.resetPassword = exports.forgotPassword = exports.changePassword = exports.logout = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const typeorm_1 = require("typeorm");
const data_source_1 = require("../../config/data-source");
const user_entity_1 = require("../../entities/user.entity");
const user_session_entity_1 = require("../../entities/user-session.entity");
const password_reset_token_entity_1 = require("../../entities/password-reset-token.entity");
const profile_contact_change_otp_entity_1 = require("../../entities/profile-contact-change-otp.entity");
const enums_1 = require("../../common/constants/enums");
const app_error_1 = require("../../common/errors/app-error");
const jwtHelper_1 = require("../../utils/jwtHelper");
const mailer_1 = require("../../utils/mailer");
const user_service_1 = require("../users/user.service");
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// ==========================================
// 1. LOGIN
// ==========================================
const login = async (input, ipAddress, userAgent) => {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const sessionRepository = data_source_1.AppDataSource.getRepository(user_session_entity_1.UserSession);
    const user = await userRepository.findOne({
        where: { email: input.email },
        relations: ['role'],
    });
    if (!user) {
        throw new Error('Email hoặc mật khẩu không chính xác');
    }
    if (user.status !== enums_1.UserStatus.ACTIVE) {
        throw new Error('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin');
    }
    const isPasswordMatch = await bcryptjs_1.default.compare(input.password, user.password_hash);
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
    const { accessToken, refreshToken } = (0, jwtHelper_1.generateTokens)({
        id: user.id,
        agency_id: user.agency_id,
        role: user.role.name,
        sid: savedSession.id,
    });
    savedSession.refresh_token_hash = await bcryptjs_1.default.hash(refreshToken, 10);
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
exports.login = login;
// ==========================================
// 2. LOGOUT
// ==========================================
const logout = async (refreshToken) => {
    const sessionRepository = data_source_1.AppDataSource.getRepository(user_session_entity_1.UserSession);
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
        const userId = decoded.id;
        const sessionId = decoded.sid;
        if (!sessionId) {
            return true;
        }
        const session = await sessionRepository.findOne({
            where: {
                id: sessionId,
                user_id: userId,
                revoked_at: (0, typeorm_1.IsNull)(),
                expires_at: (0, typeorm_1.MoreThan)(new Date()),
            },
        });
        if (!session)
            return true;
        const isMatch = await bcryptjs_1.default.compare(refreshToken, session.refresh_token_hash);
        if (!isMatch)
            return true;
        session.revoked_at = new Date();
        await sessionRepository.save(session);
        return true;
    }
    catch {
        return true;
    }
};
exports.logout = logout;
// ==========================================
// 3. ĐỔI MẬT KHẨU (ĐANG ĐĂNG NHẬP)
// ==========================================
const changePassword = async (userId, input) => {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const sessionRepository = data_source_1.AppDataSource.getRepository(user_session_entity_1.UserSession);
    const user = await userRepository.findOneBy({ id: userId });
    if (!user)
        throw new Error('Không tìm thấy người dùng');
    const isMatch = await bcryptjs_1.default.compare(input.oldPassword, user.password_hash);
    if (!isMatch) {
        throw new Error('Mật khẩu hiện tại không chính xác');
    }
    user.password_hash = await bcryptjs_1.default.hash(input.newPassword, 10);
    await userRepository.save(user);
    await sessionRepository.update({ user_id: userId }, { revoked_at: new Date() });
    return true;
};
exports.changePassword = changePassword;
// ==========================================
// 4. QUÊN MẬT KHẨU
// ==========================================
const forgotPassword = async (input) => {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const tokenRepository = data_source_1.AppDataSource.getRepository(password_reset_token_entity_1.PasswordResetToken);
    const user = await userRepository.findOneBy({ email: input.email });
    if (!user) {
        throw new Error('Email này không tồn tại trong hệ thống. Vui lòng liên hệ Quản trị viên');
    }
    const rawToken = crypto_1.default.randomBytes(32).toString('hex');
    const hashedToken = crypto_1.default
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
    await (0, mailer_1.sendResetPasswordEmail)(user.email, user.full_name, resetLink);
    return true;
};
exports.forgotPassword = forgotPassword;
// ==========================================
// 5. RESET MẬT KHẨU
// ==========================================
const resetPassword = async (input) => {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const tokenRepository = data_source_1.AppDataSource.getRepository(password_reset_token_entity_1.PasswordResetToken);
    const sessionRepository = data_source_1.AppDataSource.getRepository(user_session_entity_1.UserSession);
    const hashedToken = crypto_1.default
        .createHash('sha256')
        .update(input.token)
        .digest('hex');
    const resetRecord = await tokenRepository.findOne({
        where: {
            token_hash: hashedToken,
            used_at: (0, typeorm_1.IsNull)(),
            expires_at: (0, typeorm_1.MoreThan)(new Date()),
        },
    });
    if (!resetRecord) {
        throw new Error('Đường dẫn đã hết hạn (quá 15 phút) hoặc không hợp lệ, vui lòng yêu cầu gửi lại');
    }
    const user = await userRepository.findOneBy({
        id: resetRecord.user_id,
    });
    if (user) {
        user.password_hash = await bcryptjs_1.default.hash(input.newPassword, 10);
        await userRepository.save(user);
    }
    resetRecord.used_at = new Date();
    await tokenRepository.save(resetRecord);
    await sessionRepository.update({ user_id: resetRecord.user_id }, { revoked_at: new Date() });
    return true;
};
exports.resetPassword = resetPassword;
// ==========================================
// 6. PROFILE (ME) — đọc / cập nhật tên / đổi email-SĐT qua OTP
// ==========================================
const CONTACT_OTP_COOLDOWN_MS = 45000;
const CONTACT_OTP_TTL_MINUTES = 15;
function hashProfileOtp(userId, kind, code) {
    const pepper = process.env.JWT_SECRET || 'smartdrive-profile-otp';
    return crypto_1.default.createHash('sha256').update(`${pepper}:${userId}:${kind}:${code}`).digest('hex');
}
function generateSixDigitOtp() {
    return crypto_1.default.randomInt(0, 1000000).toString().padStart(6, '0');
}
const getMe = async (userId) => {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
    });
    if (!user)
        throw new app_error_1.AppError('Không tìm thấy người dùng.', 404);
    return {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        agency_id: user.agency_id,
    };
};
exports.getMe = getMe;
const updateMyProfile = async (userId, input) => {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const user = await userRepository.findOneBy({ id: userId });
    if (!user)
        throw new app_error_1.AppError('Không tìm thấy người dùng.', 404);
    user.full_name = input.full_name.trim();
    await userRepository.save(user);
    return { full_name: user.full_name };
};
exports.updateMyProfile = updateMyProfile;
const requestProfileContactChange = async (userId, input) => {
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const otpRepository = data_source_1.AppDataSource.getRepository(profile_contact_change_otp_entity_1.ProfileContactChangeOtp);
    const user = await userRepository.findOneBy({ id: userId });
    if (!user)
        throw new app_error_1.AppError('Không tìm thấy người dùng.', 404);
    const kind = input.kind;
    const newValue = kind === 'EMAIL' ? input.newEmail.trim().toLowerCase() : input.newPhone.trim();
    if (kind === 'EMAIL' && newValue === user.email.toLowerCase()) {
        throw new app_error_1.AppError('Email mới trùng với email hiện tại.', 400);
    }
    if (kind === 'PHONE' && newValue === user.phone) {
        throw new app_error_1.AppError('Số điện thoại mới trùng với số hiện tại.', 400);
    }
    await (0, user_service_1.assertUniqueEmailPhoneByAgency)(user.agency_id ?? null, kind === 'EMAIL' ? newValue : undefined, kind === 'PHONE' ? newValue : undefined, userId);
    const last = await otpRepository.findOne({
        where: { user_id: userId, kind },
        order: { created_at: 'DESC' },
    });
    if (last) {
        const elapsed = Date.now() - new Date(last.created_at).getTime();
        if (elapsed < CONTACT_OTP_COOLDOWN_MS) {
            const waitSec = Math.ceil((CONTACT_OTP_COOLDOWN_MS - elapsed) / 1000);
            throw new app_error_1.AppError(`Vui lòng chờ ${waitSec}s trước khi gửi mã lại.`, 429);
        }
    }
    await otpRepository
        .createQueryBuilder()
        .delete()
        .from(profile_contact_change_otp_entity_1.ProfileContactChangeOtp)
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
    const mailKind = kind === 'EMAIL' ? 'email' : 'phone';
    try {
        await (0, mailer_1.sendProfileContactChangeOtpEmail)(mailTo, user.full_name, rawOtp, mailKind, newValue);
    }
    catch {
        await otpRepository.delete({ id: row.id });
        throw new app_error_1.AppError('Không gửi được email mã xác nhận. Vui lòng kiểm tra cấu hình SMTP.', 500);
    }
    return {
        message: 'Đã gửi mã xác nhận.',
        sentToMasked: kind === 'PHONE' ? maskEmail(user.email) : maskEmail(newValue),
        expiresInMinutes: CONTACT_OTP_TTL_MINUTES,
    };
};
exports.requestProfileContactChange = requestProfileContactChange;
function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain)
        return '***';
    const keep = Math.min(2, local.length);
    return `${local.slice(0, keep)}***@${domain}`;
}
const verifyProfileContactChange = async (userId, input) => {
    const otpRepository = data_source_1.AppDataSource.getRepository(profile_contact_change_otp_entity_1.ProfileContactChangeOtp);
    const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
    const now = new Date();
    const record = await otpRepository.findOne({
        where: {
            user_id: userId,
            kind: input.kind,
            used_at: (0, typeorm_1.IsNull)(),
            expires_at: (0, typeorm_1.MoreThan)(now),
        },
        order: { created_at: 'DESC' },
    });
    if (!record) {
        throw new app_error_1.AppError('Mã không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại.', 400);
    }
    const tryHash = hashProfileOtp(userId, input.kind, input.otp);
    if (tryHash !== record.otp_hash) {
        throw new app_error_1.AppError('Mã OTP không chính xác.', 400);
    }
    const user = await userRepository.findOneBy({ id: userId });
    if (!user)
        throw new app_error_1.AppError('Không tìm thấy người dùng.', 404);
    await (0, user_service_1.assertUniqueEmailPhoneByAgency)(user.agency_id ?? null, input.kind === 'EMAIL' ? record.new_value : undefined, input.kind === 'PHONE' ? record.new_value : undefined, userId);
    if (input.kind === 'EMAIL') {
        user.email = record.new_value;
    }
    else {
        user.phone = record.new_value;
    }
    await userRepository.save(user);
    record.used_at = now;
    await otpRepository.save(record);
    await otpRepository
        .createQueryBuilder()
        .delete()
        .from(profile_contact_change_otp_entity_1.ProfileContactChangeOtp)
        .where('user_id = :uid AND kind = :kind AND used_at IS NULL', { uid: userId, kind: input.kind })
        .execute();
    return {
        email: user.email,
        phone: user.phone,
    };
};
exports.verifyProfileContactChange = verifyProfileContactChange;
//# sourceMappingURL=auth.service.js.map