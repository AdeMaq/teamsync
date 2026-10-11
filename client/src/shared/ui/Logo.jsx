export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
        <span className="text-navy font-bold text-xs">TS</span>
      </div>
      <span className="font-semibold text-[15px] tracking-tight text-white">TeamSync</span>
    </div>
  );
}
