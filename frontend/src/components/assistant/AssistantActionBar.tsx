import { Link } from 'react-router-dom';

type AssistantAction = {
  label: string;
  description: string;
  to?: string;
  onClick?: () => void;
};

type AssistantActionBarProps = {
  context: string;
  contextData?: Record<string, any>;
};

function buildActions(context: string, contextData?: Record<string, any>): AssistantAction[] {
  void contextData;

  switch (context) {
    case 'dashboard':
      return [
        {
          label: 'Review live dispatch',
          description: 'Go straight to the cases that can still change today\'s service posture.',
          to: '/admin/dispatch',
        },
        {
          label: 'Clear onboarding blockers',
          description: 'Work the verification queue holding clinicians back from release.',
          to: '/admin/access',
        },
        {
          label: 'Read the operating signals',
          description: 'Check trend, workload, and exception patterns behind today\'s story.',
          to: '/admin/analytics',
        },
      ];

    case 'dispatch':
      return [
        {
          label: 'Review broader queue',
          description: 'Move out of the live console and work the wider backlog deliberately.',
          to: '/admin/requests',
        },
        {
          label: 'Rebalance the board',
          description: 'Review coverage, conflicts, and workload before service risk spreads.',
          to: '/admin/scheduling',
        },
        {
          label: 'Inspect escalations',
          description: 'Check the unresolved items that are starting to age beyond dispatch.',
          to: '/admin/escalations',
        },
      ];

    case 'scheduling':
      return [
        {
          label: 'Move into live dispatch',
          description: 'Switch from planning into active coordination when timing becomes critical.',
          to: '/admin/dispatch',
        },
        {
          label: 'Review workforce coverage',
          description: 'Check who is available, overloaded, or best placed to absorb new work.',
          to: '/admin/team',
        },
        {
          label: 'Check unresolved items',
          description: 'See which issues are now affecting assignment quality or coverage.',
          to: '/admin/unresolved-items',
        },
      ];

    case 'analytics':
      return [
        {
          label: 'Investigate live issues',
          description: 'Jump from the metrics into the live cases creating today\'s pressure.',
          to: '/admin/dispatch',
        },
        {
          label: 'Work the review backlog',
          description: 'Open clinician review and clear the operational items behind the metrics.',
          to: '/admin/clinician-review',
        },
        {
          label: 'Inspect platform reliability',
          description: 'Check whether technical conditions are distorting operational signals.',
          to: '/admin/integrations/reliability',
        },
      ];

    default:
      return [
        {
          label: 'Return to Operations Hub',
          description: 'Go back to the main care operations command surface.',
          to: '/admin/dashboard',
        },
        {
          label: 'Review live dispatch',
          description: 'Open the urgent work surface for queue coordination and fast decisions.',
          to: '/admin/dispatch',
        },
      ];
  }
}

function contextTitle(context: string) {
  switch (context) {
    case 'dispatch':
      return 'Dispatch guidance';
    case 'scheduling':
      return 'Scheduling guidance';
    case 'analytics':
      return 'Analytics guidance';
    case 'dashboard':
      return 'Operations guidance';
    default:
      return 'Workspace guidance';
  }
}

function contextSummary(context: string, contextData?: Record<string, any>) {
  void contextData;

  switch (context) {
    case 'dashboard':
      return 'Use the dashboard to understand what is under control, what is drifting into risk, and where the team should act next.';
    case 'dispatch':
      return 'Use Dispatch Center for urgent coordination, assignment decisions, and request-linked communication tied to one live case.';
    case 'scheduling':
      return 'Use Scheduling Board for planning, recurring patterns, and workload balancing before issues become live dispatch problems.';
    case 'analytics':
      return 'Use Analytics to interpret performance patterns and route follow-up work back into the operational pages that can change the outcome.';
    default:
      return 'Use the assistant to move between related workflows in this workspace.';
  }
}

export default function AssistantActionBar({
  context,
  contextData,
}: AssistantActionBarProps) {
  const actions = buildActions(context, contextData);

  return (
    <div className="assistantPanelCompact">
      <div className="assistantPanelSummary">
        <div className="assistantPanelEyebrow">Assistant</div>
        <div className="assistantPanelHeading">{contextTitle(context)}</div>
        <div className="assistantPanelText">{contextSummary(context, contextData)}</div>
      </div>

      <div className="assistantActionList">
        {actions.map((action) =>
          action.to ? (
            <Link key={action.label} to={action.to} className="assistantActionCard">
              <div className="assistantActionTitle">{action.label}</div>
              <div className="assistantActionText">{action.description}</div>
            </Link>
          ) : (
            <button
              key={action.label}
              type="button"
              className="assistantActionCard"
              onClick={action.onClick}
            >
              <div className="assistantActionTitle">{action.label}</div>
              <div className="assistantActionText">{action.description}</div>
            </button>
          )
        )}
      </div>
    </div>
  );
}
