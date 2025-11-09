"use client";

import React, { useEffect, useState } from "react";

type LightCursorProps = {
  /** Optional: restrict the effect to a specific selector (e.g. "#canvas") */
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

    target.addEventListener("mousemove", handleMove);
    if (!(target instanceof Window)) {
      target.addEventListener("mouseleave", handleLeave);
    }

    return () => {
      target.removeEventListener("mousemove", handleMove);
      if (!(target instanceof Window)) {
        target.removeEventListener("mouseleave", handleLeave);
      }
    };
  }, [attachToSelector]);

  return (
    <div
      // Container that sits over the image area
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 150ms ease-out",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "220px",
          height: "220px",
          left: pos.x,
          top: pos.y,
          transform: "translate(-50%, -50%)",
          borderRadius: "999px",
          // Soft radial light
          background:
            "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0) 70%)",
          filter: "blur(10px)",
          // This is what makes it “lighten” things underneath
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
