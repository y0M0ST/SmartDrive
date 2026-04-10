import nodemailer from 'nodemailer';

const createMailerTransport = () =>
  nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

export const sendResetPasswordEmail = async (toEmail: string, fullName: string, resetLink: string) => {
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

export const sendNewAccountCredentialsEmail = async (
  toEmail: string,
  fullName: string,
  temporaryPassword: string,
  phone: string
) => {
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