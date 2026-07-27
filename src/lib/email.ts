import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  try {
    const info = await transporter.sendMail({
      from: `"Bot Monitor" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('[Email] Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return { success: false, error };
  }
}
