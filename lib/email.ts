import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fail fast on a blocked/unreachable network instead of hanging for a
    // minute-plus while nodemailer retries IPv6 then IPv4 — a user-facing
    // form shouldn't ever look "stuck" waiting on an outbound mail server.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const transport = getTransport();

  if (!transport) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || "EIP Africa <no-reply@eip.africa>",
    to,
    subject,
    html,
  });
}
