import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { Calendar } from "@/components/admin/Calendar";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { createClient } from "@/lib/supabase/server";
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
      <AdminNav />

      <div className="mt-10">
        <p className="eyebrow">Admin</p>
        <h1 className="page-title mt-4 text-4xl">Calendar</h1>
      </div>

      <div className="mt-10">
        <Calendar initialEvents={events} tasks={tasks} />
      </div>

      <div className="mt-16">
        <SignOutButton />
      </div>
    </section>
  );
}
