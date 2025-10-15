export default function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{ aspectRatio: "3 / 4", maxWidth: 768 }} // 3:4 and a max width; scales responsively
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 133"
        preserveAspectRatio="none"
        aria-hidden
      >
        <rect x="1" y="1" width="98" height="131" fill="none" stroke="#2c2c2c" strokeWidth="2" />
        <rect x="4" y="4" width="92" height="125" fill="none" stroke="#bfa26a" strokeWidth="1.5" />
        <rect x="7" y="7" width="86" height="119" fill="none" stroke="#2c2c2c" strokeWidth="0.8" />
      </svg>

      {/* Mat area */}
      <div className="absolute inset-0 m-[12px] bg-white overflow-hidden">
        {/* Positioning context for next/image with fill */}
        <div className="relative w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
