export default function ThreeColumnPage({
  left,
  center,
  right,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[380px_minmax(0,1fr)_380px]">
      <div className="space-y-6">{left}</div>
      <div className="space-y-6">{center}</div>
      <div className="space-y-6">{right}</div>
    </div>
  );
}
