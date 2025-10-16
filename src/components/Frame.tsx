// src/components/Frame.tsx
export default function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        aspectRatio: "2 / 3",                          // ← was 3/4
        width: "min(80vw, calc(80vh * 2 / 3))",        // ← scale ~80% of viewport height
        overflow: "visible",
      }}
    >
      {/* Frame behind the content */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full z-0"
        viewBox="0 0 100 150"                          // ← 2:3-friendly viewBox
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <rect x="2" y="2"   width="96" height="146" fill="none" stroke="#2c2c2c" strokeWidth="2" />
        <rect x="5" y="5"   width="90" height="140" fill="none" stroke="#bfa26a" strokeWidth="1.5" />
        <rect x="8" y="8"   width="84" height="134" fill="none" stroke="#2c2c2c" strokeWidth="0.8" />
      </svg>

      {/* Inner mat so art never kisses the frame edge */}
      <div className="absolute inset-4 md:inset-5 bg-white z-10">
        <div className="relative w-full h-full overflow-hidden">
          {children} {/* <Image fill ... /> goes here */}
        </div>
      </div>
    </div>
  );
}