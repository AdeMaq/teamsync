import { useId } from 'react';

// Multi-line sibling of TextField.
export default function TextAreaField({ label, error, className = '', ...props }) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-dash-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        aria-invalid={Boolean(error)}
        {...props}
        className={`w-full resize-y rounded-xl border bg-dash-inset px-3 py-2 text-sm text-dash-text outline-none transition-colors
          placeholder:text-dash-muted/60 ${error ? 'border-red-500/70' : 'border-dash-border focus:border-dash-teal/60'}`}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
