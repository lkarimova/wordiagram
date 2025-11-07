"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const routeToBodyClass: Record<string, string> = {
  "/": "body-home",
  "/archive": "body-archive",
  "/process": "body-plain",
};

const ALL_CLASSES = ["body-home", "body-archive", "body-plain"];

export function BodyBackground({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    body.classList.remove(...ALL_CLASSES);
    const cls = routeToBodyClass[pathname] ?? "body-plain";
    body.classList.add(cls);
  }, [pathname]);

  const isHome = pathname === "/";

  return (
    <>
      {isHome && <div className="site-bg" />} {/* ONLY on home */}
      {children}
    </>
  );
}
