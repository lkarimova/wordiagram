"use client";

import React, { useEffect, useState } from "react";

type LightCursorProps = {
  attachToSelector?: string;
};

export function LightCursor({ attachToSelector }: LightCursorProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target =
      attachToSelector
        ? (document.querySelector(attachToSelector) as HTMLElement | null)
        : window;

    if (!target) return;

    // IMPORTANT: do NOT import MouseEvent from React.
    const handleMove = (e: MouseEvent) => {
      const bounds =
        target instanceof Window
          ? { left: 0, top: 0 }
          : target.getBoundingClientRect();

      setPos({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      setVisible(true);
    };

    const handleLeave = () => setVisible(false);

    // Cast handler to EventListener so TS is happy
    target.addEventListener("mousemove", handleMove as EventListener);
    if (!(target instanceof Window)) {
      target.addEventListener("mouseleave", handleLeave);
    }

    return () => {
      target.removeEventListener("mousemove", handleMove as EventListener);
      if (!(target instanceof Window)) {
        target.removeEventListener("mouseleave", handleLeave);
      }
    };
  }, [attachToSelector]);

  return (
    <div
    className="pointer-events-none absolute inset-0 z-20"
    style={{
      opacity: visible ? 1 : 0,
      transition: "opacity 150ms ease-out",
    }}
  >
    {/* Soft base halo */}
    <div
      style={{
        position: "absolute",
        width: "280px",
        height: "280px",
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
        borderRadius: "999px",
        background:
          "radial-gradient(circle, rgba(255, 240, 210, 0.35) 0%, rgba(255, 240, 210, 0.0) 70%)",
        filter: "blur(20px)",
        opacity: 0.9,
        mixBlendMode: "soft-light",
      }}
    />
  
    {/* Tighter highlight */}
    <div
      style={{
        position: "absolute",
        width: "160px",
        height: "160px",
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
        borderRadius: "999px",
        background:
          "radial-gradient(circle, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.0) 60%)",
        filter: "blur(8px)",
        opacity: 0.8,
        mixBlendMode: "screen", // or "overlay" if you prefer
      }}
    />
    </div>
  );
}
