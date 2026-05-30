export const appRoutes = [
  { href: "/today", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/review", label: "Review" },
] as const;

export function routeLabels() {
  return appRoutes.map((route) => route.label);
}

export function getSelectedRouteHref(pathname: string | null) {
  const firstSegment = pathname?.split("?")[0]?.split("/").filter(Boolean)[0];

  if (!firstSegment) {
    return null;
  }

  const href = `/${firstSegment}`;

  return appRoutes.some((route) => route.href === href) ? href : null;
}
