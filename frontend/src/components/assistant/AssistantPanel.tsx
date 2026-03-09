import SectionCard from '../ui/SectionCard';
import Button from '../ui/Button';

function getSuggestions(context: string, contextData?: Record<string, any>) {
  if (context === 'dashboard' && contextData?.area === 'connected_systems') {
    return [
      'Summarize connector health',
      'Show systems with warnings',
      'Explain sync posture',
    ];
  }

  if (context === 'dashboard' && contextData?.area === 'reliability') {
    return [
      'Summarize service health',
      'Explain queue backlog',
      'Show reliability concerns',
    ];
  }

  if (context === 'dashboard' && contextData?.area === 'fhir') {
    return [
      'Summarize FHIR readiness',
      'Show supported resources',
      'Explain interoperability posture',
    ];
  }

  if (context === 'dashboard' && contextData?.area === 'analytics') {
    return [
      'Summarize operational trends',
      'Explain performance risks',
      'Recommend actions from analytics',
    ];
  }

  if (context === 'dashboard' && contextData?.area === 'audit') {
    return [
      'Summarize recent audit events',
      'Explain traceability posture',
      'Show controlled workflow actions',
    ];
  }

  if (context === 'dashboard') {
    return [
      'Summarize today’s priorities',
      'Show open exceptions',
      'Explain coverage health',
      'Recommend next actions',
    ];
  }

  if (context === 'dispatch' && contextData?.page === 'request_detail') {
    if (contextData?.tab === 'thread') {
      return [
        'Summarize thread activity',
        'Draft a coordination update',
        'Show next communication step',
      ];
    }

    if (contextData?.tab === 'timeline') {
      return [
        'Summarize timeline',
        'Highlight latest event',
        'Explain request progression',
      ];
    }

    if (contextData?.tab === 'evv') {
      return [
        'Explain EVV posture',
        'Show visit verification risk',
        'Recommend next EVV action',
      ];
    }

    return [
      'Summarize this request',
      'Explain service risk',
      'Show next actions',
      'Summarize timeline',
    ];
  }

  if (context === 'dispatch' && contextData?.page === 'request_queue') {
    return [
      'Summarize queued requests',
      'Show critical items',
      'Explain queue backlog',
      'Recommend next queue actions',
    ];
  }

  if (context === 'dispatch') {
    return [
      'Show high priority exceptions',
      'Summarize late check-ins',
      'Suggest reassignment options',
    ];
  }

  return ['Summarize this workspace', 'Show priorities', 'Recommend next actions'];
}

export default function AssistantPanel({
  context,
  contextData,
}: {
  context: string;
  contextData?: Record<string, any>;
}) {
  const suggestions = getSuggestions(context, contextData);

  return (
    <SectionCard
      title="Operational assistant"
      subtitle="Context-aware prompts for this workspace"
    >
      <div className="space-y-3">
        <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Use the floating assistant for detailed guidance. These prompts reflect the current workspace.
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <Button key={suggestion} variant="secondary" size="sm" type="button">
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
