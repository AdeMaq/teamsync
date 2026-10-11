import Card from '../../../shared/ui/Card';

export default function StatsCard({ label, icon: Icon, value, caption }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-dash-muted">{label}</p>
        <Icon size={16} className="text-dash-teal" />
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-dash-text">{value}</p>
      <p className="mt-2 text-xs text-dash-muted">{caption}</p>
    </Card>
  );
}
