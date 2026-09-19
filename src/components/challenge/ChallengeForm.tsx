"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ExternalLink, File as FileIcon, Loader2 } from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { challengeFormSchema, type ChallengeFormValues } from "@/lib/challenge-schema";

type ContactTab = "email" | "call";

export function ChallengeForm() {
  const [tab, setTab] = useState<ContactTab>("email");
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [agreed, setAgreed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeFormSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      company: "",
      email: "",
      challenge: "",
      successLooksLike: "",
      // Not shown in this simplified form — a neutral default so the
      // required backend field (and non-null DB column) still gets a value.
      urgency: "exploring",
      anythingElse: "",
      website: "",
    },
  });

  async function onSubmit(values: ChallengeFormValues) {
    try {
      const response = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Request failed");

      setSubmitState("success");
      setAgreed(false);
      setFileName(null);
      reset();
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {submitState === "success" ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5 py-10 text-center"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Thank you — we&apos;ve got it.</h3>
            <p className="mx-auto max-w-sm leading-7 text-ink-muted">
              A real person will read what you shared and get back to you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitState("idle")}
            className="text-sm font-semibold text-accent transition hover:underline"
          >
            Send another message
          </button>
        </motion.div>
      ) : (
        <motion.div key="form" className="grid gap-7">
          <div className="flex rounded-full border border-black/10 bg-black/[0.03] p-1">
            <button
              type="button"
              onClick={() => setTab("email")}
              className={cn(
                "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                tab === "email" ? "bg-background text-foreground shadow-sm" : "text-ink-muted"
              )}
            >
              Send Email
            </button>
            <button
              type="button"
              onClick={() => setTab("call")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                tab === "call" ? "bg-background text-foreground shadow-sm" : "text-ink-muted"
              )}
            >
              Book a Call
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {tab === "call" ? (
            <p className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-ink-muted">
              Calendar booking isn&apos;t connected yet — add a scheduling link (Calendly, Cal.com, etc.) to enable
              this tab.
            </p>
          ) : (
            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-6"
            >
              {/* Honeypot — hidden from real visitors, left off-screen rather
                  than display:none since some bots skip that. */}
              <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
                <label htmlFor="website">Website</label>
                <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField id="fullName" label="Full Name" required error={errors.fullName?.message}>
                  <Input id="fullName" placeholder="John Smith" autoComplete="name" {...register("fullName")} />
                </FormField>
                <FormField id="email" label="Email" required error={errors.email?.message}>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                </FormField>
              </div>

              <FormField id="challenge" label="Message" required error={errors.challenge?.message}>
                <Textarea
                  id="challenge"
                  rows={5}
                  placeholder="Tell us a bit about what you need."
                  {...register("challenge")}
                />
              </FormField>

              {/* Cosmetic only — nothing is uploaded anywhere yet. Wiring
                  this up needs a storage bucket and a multipart endpoint. */}
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-black/15 bg-black/[0.02] px-4 py-6 text-center text-sm text-ink-muted transition hover:border-black/25">
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
                />
                <FileIcon className="h-4 w-4" aria-hidden="true" />
                <span>{fileName ?? "Drag and drop or upload file"}</span>
              </label>

              <label className="flex items-start gap-3 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                />
                <span>
                  Yes, I understand and agree with the <span className="underline">Terms &amp; Conditions</span> and{" "}
                  <span className="underline">Privacy Policy</span>.
                </span>
              </label>

              <AnimatePresence>
                {submitState === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -4, height: 0 }}
                    transition={{ duration: 0.2 }}
                    role="alert"
                    className="flex items-center gap-2 overflow-hidden rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Something went wrong sending your message. Please try again, or email us directly.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting || !agreed}
                className={cn(buttonVariants({ size: "lg" }), "w-full justify-center rounded-full bg-foreground text-background hover:opacity-90")}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send a Message</span>
                )}
              </button>
            </form>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
