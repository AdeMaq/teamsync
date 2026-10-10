export default function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy" role="status" aria-label="Loading">
      <div className="w-8 h-8 rounded-full border-2 border-slate-border border-t-teal-400 animate-spin" />
    </div>
  );
}
