export default function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        aspectRatio: "3 / 4",
        // ~80% of viewport height, capped by viewport width, preserving 3:4
        width: "min(80vw, calc(80vh * 3 / 4))",
        overflow: "visible",
      }}
    >
      {/* Frame BEHIND the content */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full z-0"
        viewBox="0 0 100 133"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <rect x="2" y="2" width="96" height="129" fill="none" stroke="#2c2c2c" strokeWidth="2" />
        <rect x="5" y="5" width="90" height="123" fill="none" stroke="#bfa26a" strokeWidth="1.5" />
        <rect x="8" y="8" width="84" height="117" fill="none" stroke="#2c2c2c" strokeWidth="0.8" />
      </svg>

      {/* Inner mat so the art never touches the frame edges */}
      <div className="absolute inset-4 md:inset-5 bg-white z-10">
        {/* Parent for <Image fill> */}
        <div className="relative w-full h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}