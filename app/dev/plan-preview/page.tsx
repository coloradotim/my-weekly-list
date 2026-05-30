import { notFound, redirect } from "next/navigation";
import { isDevPreviewEnabled } from "@/lib/week/preview";

export const dynamic = "force-dynamic";

export default function DevPlanPreviewPage() {
  if (!isDevPreviewEnabled()) {
    notFound();
  }

  redirect("/dev/week-preview");
}
