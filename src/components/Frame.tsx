export default function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        // 2:3 portrait
        aspectRatio: "2 / 3",
        // Make height = 80% viewport; compute width from aspect (2/3 of height)
        height: "80vh",
        width: "min(80vw, calc(80vh * 3 / 4))",
        // Keep it responsive: never exceed viewport width
        maxWidth: "90vw",
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox="0 0 100 133"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect x="1" y="1" width="98" height="131" fill="none" stroke="#2c2c2c" strokeWidth="2" />
        <rect x="4" y="4" width="92" height="125" fill="none" stroke="#bfa26a" strokeWidth="1.5" />
        <rect x="7" y="7" width="86" height="119" fill="none" stroke="#2c2c2c" strokeWidth="0.8" />
      </svg>

      {/* parent for <Image fill> must be relative with set size */}
      <div className="relative w-full h-full p-3 bg-white overflow-hidden">
        {children}
      </div>
    </div>
  );
}