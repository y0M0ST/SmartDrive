"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendProfileContactChangeOtpEmail = exports.sendNewAccountCredentialsEmail = exports.sendResetPasswordEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const createMailerTransport = () => nodemailer_1.default.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});
const sendResetPasswordEmail = async (toEmail, fullName, resetLink) => {
    const transporter = createMailerTransport();
    const mailOptions = {
        from: process.env.MAIL_FROM, // Lấy tên người gửi từ .env luôn
        to: toEmail,
        subject: '[SmartDrive] Yêu cầu khôi phục mật khẩu',
        html: `
      <h3>Xin chào ${fullName},</h3>
      <p>Hệ thống nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
      <p>Vui lòng click vào đường dẫn bên dưới để thiết lập mật khẩu mới (Link có hiệu lực trong 15 phút):</p>
      <br/>
      <a href="${resetLink}" style="padding: 10px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
        ĐẶT LẠI MẬT KHẨU
      </a>
      <br/><br/>
      <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
    `,
    };
    await transporter.sendMail(mailOptions);
};
exports.sendResetPasswordEmail = sendResetPasswordEmail;
const sendNewAccountCredentialsEmail = async (toEmail, fullName, temporaryPassword, phone) => {
    const transporter = createMailerTransport();
    const loginUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/login`
        : 'http://localhost:3000/login';
    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: toEmail,
        subject: '[SmartDrive] Tài khoản mới của bạn',
        html: `
      <h3>Xin chào ${fullName},</h3>
      <p>Tài khoản của bạn đã được tạo trên hệ thống <b>SmartDrive</b>.</p>
      <p><strong>Tên đăng nhập:</strong> ${toEmail}</p>
      <p><strong>Mật khẩu tạm thời:</strong> ${temporaryPassword}</p>
      <p><strong>Số điện thoại:</strong> ${phone}</p>
      <p>Vui lòng đăng nhập và đổi mật khẩu ngay để bảo mật tài khoản.</p>
      <a href="${loginUrl}" style="padding: 10px 15px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
        ĐĂNG NHẬP NGAY
      </a>
      <p style="margin-top: 12px;">Nếu bạn không yêu cầu tạo tài khoản này hoặc sai thông tin, vui lòng liên hệ quản trị hệ thống ngay.</p>
    `,
    };
    await transporter.sendMail(mailOptions);
};
exports.sendNewAccountCredentialsEmail = sendNewAccountCredentialsEmail;
/** OTP đổi email / SĐT (Profile) — gửi tới hộp thư người nhận `toEmail`. */
const sendProfileContactChangeOtpEmail = async (toEmail, fullName, code, kind, newValueLabel) => {
    const transporter = createMailerTransport();
    const purpose = kind === 'email'
        ? 'xác nhận địa chỉ email mới cho tài khoản SmartDrive của bạn'
        : 'xác nhận thay đổi số điện thoại cho tài khoản SmartDrive của bạn';
    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: toEmail,
        subject: kind === 'email'
            ? '[SmartDrive] Mã xác nhận đổi email'
            : '[SmartDrive] Mã xác nhận đổi số điện thoại',
        html: `
      <h3>Xin chào ${fullName},</h3>
      <p>Bạn đã yêu cầu ${purpose}.</p>
      <p><strong>Giá trị mới:</strong> ${newValueLabel}</p>
      <p>Mã xác nhận gồm 6 chữ số (hiệu lực 15 phút):</p>
      <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold;">${code}</p>
      <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email và đổi mật khẩu nếu nghi ngờ tài khoản bị lộ.</p>
    `,
    };
    await transporter.sendMail(mailOptions);
};
exports.sendProfileContactChangeOtpEmail = sendProfileContactChangeOtpEmail;
//# sourceMappingURL=mailer.js.map