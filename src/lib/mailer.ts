import nodemailer from "nodemailer";

// Outgoing mail. Sent from info@enodre.com through Microsoft 365 (where the
// enodre.com mailbox lives) when MAIL_SMTP_USER / MAIL_SMTP_PASSWORD are set.
// enodre.com's SPF only allows Microsoft 365, so "From: info@enodre.com" sent
// through Gmail would fail the check and land in spam — hence a separate login.
// Without those vars it falls back to the Gmail account, as before.
//
// Note: Microsoft turns off password (basic) SMTP login by default for
// existing tenants at the end of December 2026; it can be switched back on.

export type Mailer = {
  transporter: nodemailer.Transporter;
  /** The address mail is sent from. */
  address: string;
  provider: "microsoft365" | "gmail";
};

export function getMailer(): Mailer | null {
  const smtpUser = process.env.MAIL_SMTP_USER;
  const smtpPassword = process.env.MAIL_SMTP_PASSWORD;
  if (smtpUser && smtpPassword) {
    return {
      transporter: nodemailer.createTransport({
        host: process.env.MAIL_SMTP_HOST || "smtp.office365.com",
        port: Number(process.env.MAIL_SMTP_PORT || 587),
        secure: false,
        requireTLS: true,
        auth: { user: smtpUser, pass: smtpPassword },
      }),
      address: process.env.MAIL_FROM || smtpUser,
      provider: "microsoft365",
    };
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) {
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailAppPassword },
      }),
      address: gmailUser,
      provider: "gmail",
    };
  }
  return null;
}

/** "Name" <address> for the From header. */
export function fromHeader(mailer: Mailer, name: string) {
  return `"${name}" <${mailer.address}>`;
}
