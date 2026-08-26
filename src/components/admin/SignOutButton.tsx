import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignOutButton() {
  return (
    <form action={signOutAction} className="flex justify-center">
      <button type="submit" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
