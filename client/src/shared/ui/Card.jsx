// Dashboard surface: 1px border, 16px radius. The border brightens slightly on hover.
// Padding is set by the caller (the spec uses p-5).
export default function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag
      className={`rounded-2xl border border-dash-border bg-dash-card transition-colors
        hover:border-[#2F3A5C] ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
