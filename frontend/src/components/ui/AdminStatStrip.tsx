type StatItem = {
  label: string;
  value: string | number;
  meta?: string;
};

export default function AdminStatStrip({
  items,
}: {
  items: StatItem[];
}) {
  return (
    <div className="adminStatStrip">
      {items.map((item) => (
        <div key={item.label} className="adminStatStripCard">
          <div className="adminStatStripLabel">{item.label}</div>
          <div className="adminStatStripValue">{item.value}</div>
          {item.meta ? <div className="adminStatStripMeta">{item.meta}</div> : null}
        </div>
      ))}
    </div>
  );
}
