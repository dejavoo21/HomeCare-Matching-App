type UIStateProps = {
  title: string;
  text: string;
  actions?: React.ReactNode;
};

export function UIState({ title, text, actions }: UIStateProps) {
  return (
    <div className="uiStateCard" role="status" aria-live="polite">
      <div className="uiStateTitle">{title}</div>
      <div className="uiStateText">{text}</div>
      {actions ? <div className="mt-4">{actions}</div> : null}
    </div>
  );
}

export function UISkeletonBlock({ height = 120 }: { height?: number }) {
  return <div className="uiSkeleton" style={{ height }} aria-hidden="true" />;
}
