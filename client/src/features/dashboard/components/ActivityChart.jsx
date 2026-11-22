import Card from '../../../shared/ui/Card';

const CHART_HEIGHT_PX = 190;
const TALLEST_BAR_PX = 144; // the largest value gets this height; the rest scale in proportion
const MIN_BAR_PX = 4; // a week with work still shows a sliver; a week with none shows a flat line

// Weekly throughput: gradient bars, no axes or gridlines. `data` is [{ week, value }], oldest first;
// `week` is the label of the week (its Monday).
export default function ActivityChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value)); // 1 so a quiet stretch does not divide by zero
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="flex flex-col p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Weekly throughput</h2>
      <p className="mt-1 text-sm text-dash-muted">
        {total === 0 ? 'No tasks finished in the last 6 weeks' : 'Tasks completed per week (week starting)'}
      </p>

      {/* mt-auto: when the card is stretched to match its neighbour, the bars sit at the bottom */}
      <ul
        className="mt-auto flex items-end gap-4 pt-6"
        style={{ minHeight: CHART_HEIGHT_PX }}
        aria-label="Tasks completed per week"
      >
        {data.map(({ week, value }) => (
          <li key={week} className="flex flex-1 flex-col items-center justify-end">
            <span className="mb-2 text-xs text-dash-muted">{value}</span>
            <div
              className="w-full rounded-t-xl bg-dash-bar"
              style={{ height: Math.max(MIN_BAR_PX, Math.round((value / max) * TALLEST_BAR_PX)), opacity: value ? 1 : 0.25 }}
              role="img"
              aria-label={`Week of ${week}: ${value} tasks`}
            />
            <span className="mt-2 text-xs text-dash-muted">{week}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
