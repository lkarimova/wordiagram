// src/components/BodyBackground.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const routeToBodyClass: Record<string, string> = {
  "/": "body-home",
  "/archive": "body-archive",
  "/process": "body-process",
};

const ALL_CLASSES = ["body-home", "body-archive", "body-process", "body-plain"];

export function BodyClass() {
    const pathname = usePathname();
    useEffect(() => {
      const cls = ROUTE_CLASS_MAP[pathname] ?? "body-plain";
  
      // Remove any previous page classes
      ALL_BODY_CLASSES.forEach(c => document.body.classList.remove(c));
      // Add the current one
      document.body.classList.add(cls);
  
      // Optional cleanup on unmount
      return () => {
        ALL_BODY_CLASSES.forEach(c => document.body.classList.remove(c));
      };
    }, [pathname]);
  
    return null;
  }