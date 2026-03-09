export default function ContentGrid({
  main,
  rail,
  railWidth = '360px',
}: {
  main: React.ReactNode;
  rail: React.ReactNode;
  railWidth?: string;
}) {
  return (
    <div
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      style={{ gridTemplateColumns: `minmax(0,1fr) ${railWidth}` }}
    >
      <div className="min-w-0 space-y-6">{main}</div>
      <div className="space-y-6 self-start">{rail}</div>
    </div>
  );
}
