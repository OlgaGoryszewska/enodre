"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, CalendarDays, Handshake, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/people", label: "People", icon: Users },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/admin/linkedin", label: "LinkedIn", icon: Briefcase },
  { href: "/admin/upwork", label: "Upwork", icon: Handshake },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-3 text-sm font-medium sm:gap-5">
      {links.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.label}
            title={link.label}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border transition sm:h-auto sm:w-auto sm:border-none sm:p-0",
              isActive
                ? "border-accent bg-accent/10 text-accent sm:bg-transparent sm:text-foreground"
                : "border-black/15 text-ink-muted hover:border-black/25 hover:text-foreground sm:border-none sm:hover:bg-transparent"
            )}
          >
            <Icon className="h-4 w-4 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
