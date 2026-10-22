import { useId } from 'react';

// Native <select> in the dashboard style. Without a visible `label` it still needs an `aria-label`.
// options: [{ value, label }]
export default function SelectField({ label, options, error, className = '', selectClassName = '', ...props }) {
  const id = useId();

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-dash-muted">
          {label}
        </label>
      )}
      <select
        id={id}
        aria-invalid={Boolean(error)}
        {...props}
        className={`h-9 w-full rounded-xl border bg-dash-inset px-3 text-sm text-dash-text outline-none transition-colors
          ${error ? 'border-red-500/70' : 'border-dash-border focus:border-dash-teal/60'} ${selectClassName}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
