"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDatabaseUserAccess, getUnauthorizedEmail } from "@/lib/auth/access";
import { setReviewCellDone } from "@/lib/review/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DateOnly } from "@/lib/week/date";

type ReviewActionResult =
  | { status: "updated" }
  | { status: "blocked" }
  | { status: "error" };

export async function setReviewCellDoneAction({
  weekActivityId,
  cellDate,
  done,
}: {
  weekActivityId: string;
  cellDate: DateOnly;
  done: boolean;
}): Promise<ReviewActionResult> {
  if (!weekActivityId || !cellDate) {
    return { status: "error" };
  }

  const { supabase } = await requireAllowedUser("/review");
  const result = await setReviewCellDone({
    supabase,
    weekActivityId,
    cellDate,
    done,
  });

  if (result.status === "blocked") {
    return { status: "blocked" };
  }

  if (result.status === "error") {
    return { status: "error" };
  }

  revalidatePath("/review");
  revalidatePath("/today");
  revalidatePath("/week");
  return { status: "updated" };
}

async function requireAllowedUser(nextPath: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const access = await getDatabaseUserAccess({ supabase, user });

  if (access.status === "must-change-password") {
    redirect("/change-password");
  }

  if (access.status !== "allowed") {
    const params = new URLSearchParams();
    const unauthorizedEmail = getUnauthorizedEmail(access);
    if (unauthorizedEmail) {
      params.set("email", unauthorizedEmail);
    }
    redirect(`/unauthorized?${params.toString()}`);
  }

  return { supabase, userId: user.id };
}
