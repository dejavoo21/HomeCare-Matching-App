export function StatusTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'indigo' | 'amber' | 'blue' | 'green';
}) {
  return (
    <div className={`statusTile statusTile-${color}`}>
      <div className="statusTileLabel">{label}</div>
      <div className="statusTileValue">{value}</div>
    </div>
  );
}
