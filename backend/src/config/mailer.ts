import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST,
  port:   parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendMail = async (
  to:      string,
  subject: string,
  html:    string
) => {
  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to,
    subject,
    html,
  });
};