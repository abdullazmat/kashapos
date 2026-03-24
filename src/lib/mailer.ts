import nodemailer from "nodemailer";
import { Resend } from "resend";
import Tenant from "@/models/Tenant";

export type MailProvider = "sendgrid" | "mailgun" | "smtp" | "postmark" | "resend";

type SendTenantEmailInput = {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  settings?: any; // Optional override settings
};

// Default Resend API key provided by user
const DEFAULT_RESEND_KEY = "re_hPcsz2Ao_CVv84NqyQFZzUudkfjS85w7B";

function parsePort(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function sendTenantEmail(input: SendTenantEmailInput) {
  const tenant = await Tenant.findById(input.tenantId).lean();
  if (!tenant) {
    throw new Error("Tenant not found for email delivery");
  }

  const settings = input.settings || tenant.settings || {};
  const provider = (settings.emailProvider || "resend") as MailProvider;
  
  const fromName = settings.emailFromName || tenant.name || "MEKA POS";
  const fromEmail = settings.emailFromAddress || process.env.SMTP_FROM || "onboarding@resend.dev";
  const replyTo = settings.emailReplyToAddress || undefined;

  if (provider === "resend") {
    const apiKey = settings.emailApiKey || process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY;
    if (!apiKey) {
      throw new Error("Resend API key is not configured");
    }

    let resendFrom = `${fromName} <${fromEmail}>`;
    
    // Resend requires a verified domain. If using a public provider like gmail/yahoo/etc,
    // it will fail unless we use onboarding@resend.dev (for testing/unverified accounts).
    const isPublicDomain = /@(gmail|yahoo|outlook|hotmail|icloud|me|msn)\.com$/i.test(fromEmail);
    if (isPublicDomain || fromEmail.includes("example.com")) {
      console.log(`Overriding unverified Resend from address: ${fromEmail} -> onboarding@resend.dev`);
      resendFrom = `${fromName} <onboarding@resend.dev>`;
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text || "",
      replyTo,
    });

    if (error) {
      if (
        process.env.NODE_ENV === "development" &&
        (error.message.includes("testing emails to your own email address") ||
          error.message.includes("restricted"))
      ) {
        console.warn("\n" + "=".repeat(60));
        console.warn("⚠️  RESEND TESTING RESTRICTION TRIGGERED");
        console.warn(`To: ${input.to}`);
        console.warn(`Subject: ${input.subject}`);
        console.warn("Emails can't be delivered to non-authorized accounts in Resend trial.");
        console.warn("Check the console below for the email content (e.g. verification links).");
        console.warn("=".repeat(60) + "\n");
        console.log(input.html);
        console.log("\n" + "=".repeat(60) + "\n");
        return { id: "mock-success-for-testing", mock: true };
      }

      console.error("Resend delivery failed:", error);
      throw new Error(`Resend delivery failed: ${error.message}`);
    }
    return data;
  }

  // Fallback to SMTP for other providers or if SMTP is selected
  const host = settings.emailSmtpHost || process.env.SMTP_HOST;
  const port = parsePort(settings.emailSmtpPort || process.env.SMTP_PORT, 587);
  const user = settings.emailSmtpUser || process.env.SMTP_USER;
  const pass = settings.emailSmtpPassword || process.env.SMTP_PASS;

  if (!fromEmail) {
    throw new Error("From email address is not configured");
  }

  if (!host || !user || !pass) {
    // If SMTP is explicitly selected but is missing configuration,
    // and we have a Resend key, fallback to Resend as a "safe default"
    // to prevent delivery failure, unless provider was explicitly "smtp" 
    // and we want strict errors. But for POS users, success is better.
    console.warn(`SMTP misconfigured, attempting Resend fallback for provider: ${provider}`);
    const resendApiKey = settings.emailApiKey || process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY;
    if (resendApiKey) {
      let resendFromFallback = `${fromName} <${fromEmail}>`;
      const isPublicDomain = /@(gmail|yahoo|outlook|hotmail|icloud|me|msn)\.com$/i.test(fromEmail);
      if (isPublicDomain || fromEmail.includes("example.com")) {
        resendFromFallback = `${fromName} <onboarding@resend.dev>`;
      }

      const resendFallback = new Resend(resendApiKey);
      const { data, error } = await resendFallback.emails.send({
        from: resendFromFallback,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text || "",
        replyTo,
      });
      if (error) {
        throw new Error(`SMTP misconfigured and Resend fallback failed: ${error.message}`);
      }
      return data;
    }

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
