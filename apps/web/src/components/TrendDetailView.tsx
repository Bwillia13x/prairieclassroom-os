import type { DrillDownContext } from "../types";
import Sparkline from "./Sparkline";

interface Props {
  context: Extract<DrillDownContext, { type: "trend" }>;
}

export default function TrendDetailView({ context }: Props) {
  const { data } = context;

  const today = new Date();
  const rows = data.map((value, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (data.length - 1 - i));
    return { date: d, value };
  });

  return (
    <>
      <div className="drill-down-trend-chart">
        <Sparkline
          data={data}
          width={340}
          height={160}
          label={context.label}
        />
      </div>

      <div className="drill-down-section">
        <h4>Daily values</h4>
        <table className="drill-down-trend-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ date, value }, i) => (
              <tr key={i}>
                <td>
                  {date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
