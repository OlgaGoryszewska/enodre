"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { FormField } from "@/components/challenge/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  challengeFormSchema,
  urgencyOptions,
  type ChallengeFormValues,
} from "@/lib/challenge-schema";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function ChallengeForm() {
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
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
      anythingElse: "",
      website: "",
    },
  });

  const [fullNameValue, emailValue] = watch(["fullName", "email"]);
  const showMoreFields = fullNameValue.trim().length > 0 && emailValue.trim().length > 0;

  async function onSubmit(values: ChallengeFormValues) {
    try {
      const response = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Request failed");

      setSubmitState("success");
      reset();
    } catch {
      setSubmitState("error");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] border border-black/10 bg-card p-6 shadow-[0_1px_2px_rgba(23,33,27,0.04),0_20px_45px_-25px_rgba(23,33,27,0.25)] sm:p-10 md:p-12">
      <AnimatePresence mode="wait" initial={false}>
        {submitState === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5 py-10 text-center sm:py-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent"
            >
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </motion.div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold tracking-tight">
                Thank you — we&apos;ve got it.
              </h3>
              <p className="mx-auto max-w-sm leading-7 text-ink-muted">
                A real person will read what you shared. If it looks like we
                can genuinely help, we&apos;ll reach out to schedule a free
                discovery session.
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
          <motion.form
            key="form"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-7"
          >
            {/* Honeypot — hidden from real visitors, left off-screen rather
                than display:none since some bots skip that. */}
            <div
              aria-hidden="true"
              className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
            >
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register("website")}
              />
            </div>

            <motion.div
              variants={itemVariants}
              className="grid gap-7 sm:grid-cols-2"
            >
              <FormField
                id="fullName"
                label="Full Name"
                required
                error={errors.fullName?.message}
              >
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  autoComplete="name"
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  {...register("fullName")}
                />
              </FormField>

              <FormField
                id="email"
                label="Email"
                required
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
              </FormField>
            </motion.div>

            {!showMoreFields && (
              <motion.p
                variants={itemVariants}
                className="text-sm text-ink-muted"
              >
                Tell us who you are, and the rest of the form will follow.
              </motion.p>
            )}

            <AnimatePresence initial={false}>
              {showMoreFields && (
                <motion.div
                  key="rest-of-form"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid gap-7 pt-7"
                  >
                    <motion.div variants={itemVariants}>
                      <FormField id="company" label="Company" error={errors.company?.message}>
                        <Input
                          id="company"
                          placeholder="Acme Logistics"
                          autoComplete="organization"
                          {...register("company")}
                        />
                      </FormField>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <FormField
                        id="challenge"
                        label="What challenge are you facing?"
                        required
                        error={errors.challenge?.message}
                      >
                        <Textarea
                          id="challenge"
                          rows={5}
                          placeholder="What's happening today? What keeps taking more time, money, or effort than it should? Describe the situation in your own words."
                          aria-invalid={!!errors.challenge}
                          aria-describedby={errors.challenge ? "challenge-error" : undefined}
                          {...register("challenge")}
                        />
                      </FormField>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <FormField
                        id="successLooksLike"
                        label="What would success look like?"
                        error={errors.successLooksLike?.message}
                      >
                        <Textarea
                          id="successLooksLike"
                          rows={4}
                          placeholder="Imagine this problem disappeared tomorrow. What would be different for your team or your business?"
                          {...register("successLooksLike")}
                        />
                      </FormField>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <Controller
                        control={control}
                        name="urgency"
                        render={({ field }) => (
                          <FormField
                            id="urgency"
                            as="fieldset"
                            label="How urgent is this?"
                            required
                            error={errors.urgency?.message}
                          >
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="grid gap-3 sm:grid-cols-2"
                            >
                              {urgencyOptions.map((option) => {
                                const isSelected = field.value === option.value;
                                return (
                                  <label
                                    key={option.value}
                                    htmlFor={`urgency-${option.value}`}
                                    className={cn(
                                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-colors duration-150",
                                      isSelected
                                        ? "border-accent bg-accent/10 text-foreground"
                                        : "border-black/10 text-ink-muted hover:border-black/25 hover:text-foreground"
                                    )}
                                  >
                                    <RadioGroupItem
                                      id={`urgency-${option.value}`}
                                      value={option.value}
                                    />
                                    {option.label}
                                  </label>
                                );
                              })}
                            </RadioGroup>
                          </FormField>
                        )}
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <FormField
                        id="anythingElse"
                        label="Anything else you'd like us to know?"
                        error={errors.anythingElse?.message}
                      >
                        <Textarea
                          id="anythingElse"
                          rows={3}
                          placeholder="Anything that helps us better understand your situation."
                          {...register("anythingElse")}
                        />
                      </FormField>
                    </motion.div>

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
                          <span>
                            Something went wrong sending your message. Please try
                            again, or email us directly.
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      variants={itemVariants}
                      className="mt-2 flex flex-col items-center gap-6"
                    >
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        initial="rest"
                        whileHover="hover"
                        whileTap={{ scale: 0.98 }}
                        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <span>Untangle My Challenge</span>
                            <motion.span
                              variants={{ rest: { x: 0 }, hover: { x: 4 } }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className="inline-flex"
                            >
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </motion.span>
                          </>
                        )}
                      </motion.button>

                      <p className="mx-auto max-w-md text-center text-sm leading-6 text-ink-muted">
                        Every submission is reviewed by a real person. If we believe
                        we can genuinely help, we&apos;ll invite you to a free
                        discovery session to understand your business and explore
                        possible solutions together.
                        <br className="hidden sm:block" />
                        No pressure. No generic sales pitch. Just an honest
                        conversation.
                      </p>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
