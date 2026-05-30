export const appRoutes = [
  { href: "/today", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/review", label: "Review" },
] as const;

export function routeLabels() {
  return appRoutes.map((route) => route.label);
}
