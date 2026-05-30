"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const mobileActivityColumnWidth = 116;
const desktopActivityColumnWidth = 172;
const mobileVisibleDayCount = 4;
const desktopVisibleDayCount = 7;

export function useWeekGridLayout() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const headerScrollerRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState({
    activityColumnWidth: mobileActivityColumnWidth,
    dayColumnWidth: 64,
  });

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const scrollerElement = scroller;

    function updateMetrics() {
      const isDesktop = window.matchMedia("(min-width: 640px)").matches;
      const activityColumnWidth = isDesktop
        ? desktopActivityColumnWidth
        : mobileActivityColumnWidth;
      const visibleDayCount = isDesktop ? desktopVisibleDayCount : mobileVisibleDayCount;
      const availableDayWidth = scrollerElement.clientWidth - activityColumnWidth;

      setMetrics({
        activityColumnWidth,
        dayColumnWidth: Math.max(48, availableDayWidth / visibleDayCount),
      });
    }

    updateMetrics();

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(scrollerElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const headerScroller = headerScrollerRef.current;

    if (!scroller || !headerScroller) {
      return;
    }

    const scrollerElement = scroller;
    const headerScrollerElement = headerScroller;

    function syncHeaderScroll() {
      headerScrollerElement.scrollLeft = scrollerElement.scrollLeft;
    }

    syncHeaderScroll();
    scrollerElement.addEventListener("scroll", syncHeaderScroll, { passive: true });

    return () => scrollerElement.removeEventListener("scroll", syncHeaderScroll);
  }, []);

  return {
    scrollerRef,
    headerScrollerRef,
    scrollerStyle: {
      scrollPaddingLeft: `${metrics.activityColumnWidth}px`,
    } satisfies CSSProperties,
    gridStyle: {
      gridTemplateColumns: `${metrics.activityColumnWidth}px repeat(7, ${metrics.dayColumnWidth}px)`,
    } satisfies CSSProperties,
  };
}
