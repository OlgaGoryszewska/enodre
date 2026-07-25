import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { challengeFormSchema, urgencyOptions } from "@/lib/challenge-schema";

const RECIPIENT = "olga.goryszewska@gmail.com";

function urgencyLabel(value: string) {
  return urgencyOptions.find((option) => option.value === value)?.label ?? value;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = challengeFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission." },
      { status: 400 }
    );
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error(
      "Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars — email not sent."
    );
    return NextResponse.json(
      { ok: false, error: "Email is not configured." },
      { status: 500 }
    );
  }

  const {
    fullName,
    company,
    email,
    challenge,
    successLooksLike,
    urgency,
    anythingElse,
  } = parsed.data;

  const subject = `New challenge submission — ${fullName} (${urgencyLabel(urgency)})`;

  const textBody = [
    `Name: ${fullName}`,
    company && `Company: ${company}`,
    `Email: ${email}`,
    `Urgency: ${urgencyLabel(urgency)}`,
    "",
    "What challenge are they facing?",
    challenge,
    successLooksLike &&
      ["", "What would success look like?", successLooksLike].join("\n"),
    anythingElse && ["", "Anything else?", anythingElse].join("\n"),
  ]
    .filter(Boolean)
    .join("\n");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  try {
    await transporter.sendMail({
      from: `"Enodre website" <${gmailUser}>`,
      to: RECIPIENT,
      replyTo: email,
      subject,
      text: textBody,
    });
  } catch (error) {
    console.error("Failed to send challenge submission email:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to send message." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
