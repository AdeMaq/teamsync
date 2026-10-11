import Card from '../shared/ui/Card';

// PLACEHOLDER for pages that are not built yet (projects, messages, team, settings).
export default function PlaceholderPage({ title }) {
  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">{title}</h2>
      <p className="mt-1 text-sm text-dash-muted">This section is coming soon.</p>
    </Card>
  );
}
