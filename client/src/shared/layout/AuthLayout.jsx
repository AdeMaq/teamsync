export default function AuthLayout({ children }) {
  return (
    <div className="flex w-full min-h-screen">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[42%] bg-left-panel relative flex-col justify-between px-12 py-12 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-70"
          viewBox="0 0 500 800"
          xmlns="http://www.w3.org/2000/svg"
        >
          {[
            [60, 120, 180, 200], [180, 200, 120, 340], [180, 200, 320, 180],
            [320, 180, 420, 280], [120, 340, 260, 420], [260, 420, 400, 460],
            [260, 420, 180, 560], [180, 560, 300, 640], [400, 460, 440, 600],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2DD4BF" strokeOpacity="0.18" strokeWidth="1" />
          ))}
          {[
            [60, 120, 4], [180, 200, 5], [320, 180, 3.5], [420, 280, 4],
            [120, 340, 4.5], [260, 420, 5], [400, 460, 4], [180, 560, 4],
            [300, 640, 3.5], [440, 600, 4],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="#2DD4BF" opacity="0.55" />
          ))}
        </svg>

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <span className="text-navy font-bold text-xs">TS</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight">TeamSync</span>
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="text-3xl font-bold leading-tight text-[#F5F7FA]">
            Where remote teams stay in sync.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Workspaces, projects, tasks, and real-time chat — one workspace for every team, wherever they log in from.
          </p>
        </div>

        <p className="relative z-10 text-xs text-[#5C6579]">
          © {new Date().getFullYear()} TeamSync. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-navy">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
              <span className="text-navy font-bold text-xs">TS</span>
            </div>
            <span className="font-semibold text-[15px]">TeamSync</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}