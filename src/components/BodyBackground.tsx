"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const routeToBodyClass: Record<string, string> = {
  "/": "body-home",          // homepage -> living room image
  "/archive": "body-archive",// archive page -> different image
  "/process": "body-plain",  // process page -> no image
};

const ALL_CLASSES = ["body-home", "body-archive", "body-plain"];

export function BodyBackground({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;

    // clear previous classes
    body.classList.remove(...ALL_CLASSES);

    // pick class for this route (default to plain)
    const cls = routeToBodyClass[pathname] ?? "body-plain";
    body.classList.add(cls);
  }, [pathname]);

  return <>{children}</>;
}
