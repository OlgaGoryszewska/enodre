import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { challengeFormSchema, urgencyLabel } from "@/lib/challenge-schema";

const RECIPIENT = "olga.goryszewska@gmail.com";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = challengeFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission." },
      { status: 400 }
    );
  }

  // Honeypot — real visitors never fill this. Bots that do get a fake
  // success with no side effects, so the mechanism isn't revealed.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
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

  // Persist first, so a lead is never lost just because Gmail SMTP hiccups.
  let savedToDatabase = false;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY env vars — submission not saved."
    );
  } else {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.from("contacts").insert({
        full_name: fullName,
        company: company || null,
        email,
        challenge,
        success_looks_like: successLooksLike || null,
        urgency,
        anything_else: anythingElse || null,
      });
      if (error) throw error;
      savedToDatabase = true;
    } catch (error) {
      console.error("Failed to save contact submission to Supabase:", error);
    }
  }

  // Email is a secondary notification path — its failure alone shouldn't
  // make the user retry (and risk a duplicate submission) if the lead was
  // already saved above.
  let emailSent = false;
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    console.error(
      "Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars — email not sent."
    );
  } else {
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
      emailSent = true;
    } catch (error) {
      console.error("Failed to send challenge submission email:", error);
    }
  }

  if (!savedToDatabase && !emailSent) {
    return NextResponse.json(
      { ok: false, error: "Failed to send message." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
