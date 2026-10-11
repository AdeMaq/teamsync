import Card from '../../../shared/ui/Card';

const CHART_HEIGHT_PX = 190;
const TALLEST_BAR_PX = 144; // the largest value gets this height; the rest scale in proportion

// Weekly throughput: gradient bars, no axes or gridlines.
export default function ActivityChart({ data }) {
  const max = Math.max(...data.map((d) => d.value));

  return (
    <Card className="flex flex-col p-5">
      <h2 className="font-display text-lg font-semibold text-dash-text">Weekly throughput</h2>
      <p className="mt-1 text-sm text-dash-muted">Tasks completed per week</p>

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
              style={{ height: Math.round((value / max) * TALLEST_BAR_PX) }}
              role="img"
              aria-label={`${week}: ${value} tasks`}
            />
            <span className="mt-2 text-xs text-dash-muted">{week}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
