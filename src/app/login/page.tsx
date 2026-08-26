import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Admin sign in.",
};

export default function LoginPage() {
  return (
    <section className="shell py-20 sm:py-28">
      <div className="mx-auto max-w-md">
        <p className="eyebrow text-center">Enodre</p>
        <h1 className="page-title mt-4 text-center text-4xl">Sign in</h1>
        <div className="mt-10">
          <LoginForm />
        </div>
      </div>
    </section>
  );
}
