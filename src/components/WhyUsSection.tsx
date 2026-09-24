"use client";

import { Eye, Puzzle, Shield, Users, Zap } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const BENEFITS = [
  {
    icon: Zap,
    title: "A Thoughtful, Fast Start",
    description:
      "No unnecessary delays. A hands-on approach means the right questions get asked upfront, so we can hit the ground running — efficiently and effectively.",
    bg: "linear-gradient(135deg, #C7DBFF 0%, #E9F1FF 100%)",
    color: "#3661C4",
  },
  {
    icon: Eye,
    title: "Transparency All the Way",
    description:
      "You'll always know what to expect. A clear, structured roadmap with well-defined steps keeps the process smooth and predictable.",
    bg: "linear-gradient(135deg, #DFD1FF 0%, #F3EEFF 100%)",
    color: "#6D3FC7",
  },
  {
    icon: Users,
    title: "Scaling Without Limits",
    description: "Need more expertise? We bring in the right people so your project always has the talent it needs.",
    bg: "linear-gradient(135deg, #BEF0D3 0%, #E9FBF1 100%)",
    color: "#1B9159",
  },
  {
    icon: Puzzle,
    title: "Solutions Built Around You",
    description:
      "Every project is unique. Whether you have a clear vision or need expert guidance, we shape the product to fit your needs.",
    bg: "linear-gradient(135deg, #FFDDB0 0%, #FFF3E8 100%)",
    color: "#B5680F",
  },
  {
    icon: Shield,
    title: "Security You Can Trust",
    description:
      "Your code, data, and ideas stay yours. NDAs are standard practice, and every product is built with secure, production-grade practices from day one.",
    bg: "linear-gradient(135deg, #FFC2DE 0%, #FFF0F6 100%)",
    color: "#C23E85",
  },
];

export function WhyUsSection() {
  return (
    <section className="border-y border-black/10 bg-card py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <p className="font-funnel-display text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
            Benefits of working with us
          </p>
          <p className="font-poppins mt-4 max-w-2xl text-sm font-normal text-ink-muted">
            At Enodre, we focus on speed, clarity, and efficiency — helping you turn ideas into reality without
            unnecessary complexity. Collaboration is key to building something truly impactful.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((benefit, index) => (
            <Reveal key={benefit.title} delay={index * 0.06}>
              <div className="h-full rounded-[24px] bg-background p-8 shadow-[0_24px_48px_-30px_rgba(30,30,60,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-20px_rgba(30,30,60,0.25)]">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: benefit.bg }}
                >
                  <benefit.icon className="h-6 w-6" style={{ color: benefit.color }} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-[#1D1D1F]">{benefit.title}</h3>
                <p className="font-poppins mt-3 text-sm leading-6 text-ink-muted">{benefit.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
