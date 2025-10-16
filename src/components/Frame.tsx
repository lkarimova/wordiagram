// src/components/Frame.tsx
export default function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        aspectRatio: "3 / 4",
        width: "min(80vw, calc(80vh * 3 / 4))",
        boxSizing: "content-box",
        padding: "20px", // space for the frame stroke so it won’t look clipped
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox="0 0 100 133"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* a bit more margin inside so thick strokes never kiss the edge */}
        <rect x="2" y="2" width="96" height="129" fill="none" stroke="#2c2c2c" strokeWidth="2" />
        <rect x="5" y="5" width="90" height="123" fill="none" stroke="#bfa26a" strokeWidth="1.5" />
        <rect x="8" y="8" width="84" height="117" fill="none" stroke="#2c2c2c" strokeWidth="0.8" />
      </svg>

      {/* Parent for <Image fill>: must be relative and sized */}
      <div className="relative w-full h-full bg-white overflow-hidden">
        {children}
      </div>
    </div>
  );
}