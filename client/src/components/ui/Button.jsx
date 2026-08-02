export default function Button({ children, loading, className = '', ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`w-full rounded-lg py-2.5 text-sm font-semibold text-[#070B14]
        bg-brand-gradient disabled:opacity-60 disabled:cursor-not-allowed
        transition-opacity hover:opacity-90 ${className}`}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );
}