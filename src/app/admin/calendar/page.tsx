import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { Calendar } from "@/components/admin/Calendar";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/admin/actions";
import type { CalendarEvent } from "@/lib/calendar";
import type { Task } from "@/lib/task";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Admin calendar.",
};

export default async function AdminCalendarPage() {
  const supabase = await createClient();

  const [{ data: eventsData, error: eventsError }, { data: tasksData, error: tasksError }] =
    await Promise.all([
      supabase.from("events").select("*").order("start_time", { ascending: true }),
      supabase
        .from("tasks")
        .select("*")
        .not("start_date", "is", null)
        .not("end_date", "is", null),
    ]);

  if (eventsError) {
    console.error("Failed to load events:", eventsError);
  }
  if (tasksError) {
    console.error("Failed to load dated tasks:", tasksError);
  }

  const events = (eventsData ?? []) as CalendarEvent[];
  const tasks = (tasksData ?? []) as Task[];

  return (
    <section className="shell py-20 sm:py-28">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <AdminNav />
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-sm font-semibold text-ink-muted transition hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Calendar</h1>
      </div>

      <div className="mt-10">
        <Calendar initialEvents={events} tasks={tasks} />
      </div>
    </section>
  );
}
