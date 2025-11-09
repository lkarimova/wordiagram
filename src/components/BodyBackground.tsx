"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Map routes → body-* classes
const ROUTE_CLASS_MAP: Record<string, string> = {
  "/": "body-home",
  "/archive": "body-archive",
  "/process": "body-process",
};

// All possible page-specific body classes
const ALL_BODY_CLASSES = ["body-home", "body-archive", "body-process", "body-plain"];

export function BodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    const cls = ROUTE_CLASS_MAP[pathname] ?? "body-plain";

    // Remove any previous page classes
    ALL_BODY_CLASSES.forEach((c) => document.body.classList.remove(c));
    // Add the current one
    document.body.classList.add(cls);

    // Cleanup on unmount / route change (safety)
    return () => {
      ALL_BODY_CLASSES.forEach((c) => document.body.classList.remove(c));
    };
  }, [pathname]);

  return null;
}
