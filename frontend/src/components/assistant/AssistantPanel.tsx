import SectionCard from '../ui/SectionCard';

export default function AssistantPanel({
  context,
  contextData,
}: {
  context: string;
  contextData?: Record<string, any>;
}) {
  const contextLabel = context.split('_').join(' ');
  const pageLabel = contextData?.page ? String(contextData.page).split('_').join(' ') : null;

  return (
    <SectionCard
      title="Assistant"
      subtitle="Use the floating assistant for context-aware help in this workspace."
    >
      <div className="assistantInlineHint">
        <div className="assistantInlineHintText">Page context is active for {contextLabel}.</div>
        {contextData?.page ? (
          <div className="assistantInlineHintMeta">Context: {pageLabel}</div>
        ) : null}
      </div>
    </SectionCard>
  );
}
