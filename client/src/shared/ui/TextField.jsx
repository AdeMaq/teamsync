import { useId } from 'react';

// Compact (36px) labelled input for the logged-in app, with an inline error line.
export default function TextField({ label, error, className = '', ...props }) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-dash-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        {...props}
        className={`h-9 w-full rounded-xl border bg-dash-inset px-3 text-sm text-dash-text outline-none transition-colors
          placeholder:text-dash-muted/60 ${error ? 'border-red-500/70' : 'border-dash-border focus:border-dash-teal/60'}`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
