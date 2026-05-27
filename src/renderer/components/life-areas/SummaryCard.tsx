export function SummaryCard({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <div className="summaryCard">
      <div className="summaryValue">{value}</div>
      <div className="summaryLabel">{label}</div>
    </div>
  );
}
