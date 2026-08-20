import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP is not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS).");
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await getTransporter().sendMail({ from, ...options });
}
