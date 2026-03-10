import SectionCard from '../ui/SectionCard';
import AssistantActionBar from './AssistantActionBar';

export default function AssistantPanel({
  context,
  contextData,
}: {
  context: string;
  contextData?: Record<string, any>;
}) {
  return (
    <SectionCard
      title="Operational assistant"
      subtitle="Context-aware guidance for this workspace"
    >
      <AssistantActionBar context={context} contextData={contextData} />
    </SectionCard>
  );
}
