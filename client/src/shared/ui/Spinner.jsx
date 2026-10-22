// Small loading indicator for inside a page (Loader is the full-screen one).
export default function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-10 ${className}`} role="status" aria-label="Loading">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-dash-border border-t-dash-teal" />
    </div>
  );
}
