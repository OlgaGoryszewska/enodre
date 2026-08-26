import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/admin/actions";
import type { Task } from "@/lib/task";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Admin dashboard.",
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    console.error("Failed to load tasks:", error);
  }

  const tasks = (data ?? []) as Task[];

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
        <h1 className="page-title mt-4 text-4xl">Dashboard</h1>
      </div>

      <div className="mt-10">
        <KanbanBoard initialTasks={tasks} />
      </div>
    </section>
  );
}
