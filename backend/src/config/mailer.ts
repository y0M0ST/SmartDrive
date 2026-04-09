import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  await transporter.sendMail({
    from: `"SmartDrive" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};