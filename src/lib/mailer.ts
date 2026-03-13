import nodemailer from "nodemailer";
import Tenant from "@/models/Tenant";

export type MailProvider = "sendgrid" | "mailgun" | "smtp" | "postmark";

type SendTenantEmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function parsePort(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function sendTenantEmail(input: SendTenantEmailInput) {
  const tenant = await Tenant.findById(input.tenantId).lean();
  if (!tenant) {
    throw new Error("Tenant not found for email delivery");
  }

  const settings = tenant.settings || {};
  const provider = (settings.emailProvider || "smtp") as MailProvider;
  const host = settings.emailSmtpHost || process.env.SMTP_HOST;
  const port = parsePort(settings.emailSmtpPort || process.env.SMTP_PORT, 587);
  const user = settings.emailSmtpUser || process.env.SMTP_USER;
  const pass = settings.emailSmtpPassword || process.env.SMTP_PASS;
  const fromName = settings.emailFromName || tenant.name || "MEKA POS";
  const fromEmail = settings.emailFromAddress || process.env.SMTP_FROM;
  const replyTo = settings.emailReplyToAddress || undefined;

  if (!fromEmail) {
    throw new Error("From email address is not configured");
  }

  // API providers can still be delivered through SMTP relays.
  if (!host || !user || !pass) {
    throw new Error(
      `Email delivery is not fully configured for ${provider}. Set SMTP host, user, and password.`,
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: input.to,
    replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
