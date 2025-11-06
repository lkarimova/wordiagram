"use client";

import { useState, type ReactNode } from "react";

interface NewsRevealProps {
  clusters: string[];
  children?: ReactNode; // e.g. the "View Archive" link
}

export function NewsReveal({ clusters, children }: NewsRevealProps) {
  const [open, setOpen] = useState(false);

  const hasClusters = clusters && clusters.length > 0;

  return (
    <div className="text-center text-sm">
      {/* Row: View Archive • Reveal News */}
      <div className="mt-1 flex justify-center gap-3">
        {children}
        {hasClusters && (
        <>
          <span>•</span>    
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="underline underline-offset-2 decoration-current hover:opacity-80"
          >
            {open ? "Hide News" : "Reveal News"}
          </button>
        )}
      </div>

      {/* Cluster lines, shown only when open */}
      {open && hasClusters && (
        <div className="mt-2 text-neutral-500 italic">
          {clusters.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
