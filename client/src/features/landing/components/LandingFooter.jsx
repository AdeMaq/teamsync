export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-border">
      <div className="mx-auto max-w-[1150px] px-6 py-6">
        <p className="text-xs text-muted">© {new Date().getFullYear()} TeamSync. Remote team workspace.</p>
      </div>
    </footer>
  );
}
