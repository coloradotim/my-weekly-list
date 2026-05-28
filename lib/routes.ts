export const appRoutes = [
  { href: "/today", label: "Today" },
  { href: "/week", label: "This Week" },
  { href: "/review", label: "Review" },
  { href: "/plan", label: "Plan" },
] as const;

export function routeLabels() {
  return appRoutes.map((route) => route.label);
}
