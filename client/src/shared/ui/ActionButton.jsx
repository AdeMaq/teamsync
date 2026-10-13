const VARIANTS = {
  primary: 'bg-dash-gradient text-dash-bg hover:opacity-90',
  secondary: 'border border-dash-border bg-dash-card text-dash-text hover:border-[#2F3A5C]',
  danger: 'border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
};

// Compact (36px) button for the logged-in app. The login/landing pages use their own larger buttons.
export default function ActionButton({ variant = 'secondary', loading = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex h-9 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors
        disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
