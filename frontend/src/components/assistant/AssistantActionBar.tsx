import Button from '../ui/Button';

function getSuggestions(context: string, contextData?: Record<string, any>) {
  void contextData;
  if (context === 'dashboard') {
    return [
      'Summarize today’s priorities',
      'Show open exceptions',
      'Explain coverage health',
      'Recommend next actions',
    ];
  }

  if (context === 'dispatch') {
    return [
      'Show high priority exceptions',
      'Summarize queue pressure',
      'Recommend next actions',
    ];
  }

  return ['Summarize this workspace', 'Show priorities', 'Recommend next actions'];
}

export default function AssistantActionBar({
  context,
  contextData: _contextData,
}: {
  context: string;
  contextData?: Record<string, any>;
}) {
  const suggestions = getSuggestions(context, _contextData);

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((suggestion) => (
        <Button key={suggestion} variant="secondary" size="sm" type="button">
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
