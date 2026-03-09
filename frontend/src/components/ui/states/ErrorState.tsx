import Button from '../Button';

export default function ErrorState({
  title = 'Something went wrong',
  description,
  actionLabel = 'Retry',
  onAction,
}: {
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-xl font-bold text-rose-700">
        !
      </div>
      <h3 className="mt-4 text-xl font-semibold text-rose-900">{title}</h3>
      <p className="mt-2 text-sm text-rose-700">{description}</p>
      <div className="mt-5">
        <Button variant="danger" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
