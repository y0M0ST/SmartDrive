import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
  override: false,
});

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST,
  port:   parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const isDryRun = process.env.MAIL_DRY_RUN === 'true';

export const sendMail = async (
  to:      string,
  subject: string,
  html:    string
) => {
  if (isDryRun) {
    console.log(`[Mailer][DryRun] Skip send to ${to} with subject: ${subject}`);
    return {
      accepted: [to],
      rejected: [],
      envelope: { to: [to] },
      messageId: 'MAIL_DRY_RUN',
      response: 'MAIL_DRY_RUN',
      html,
    };
  }

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to,
    subject,
    html,
  });
};