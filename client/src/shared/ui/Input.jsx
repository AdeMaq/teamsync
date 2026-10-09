export default function Input({ label, error, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium mb-1.5 text-muted">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full rounded-lg px-3.5 py-2.5 text-sm text-[#F5F7FA] bg-input border
          placeholder:text-[#4E576B] outline-none transition-colors
          ${error ? 'border-red-500' : 'border-slate-border focus:border-teal-400'}
          focus:ring-2 focus:ring-teal-400/20`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}