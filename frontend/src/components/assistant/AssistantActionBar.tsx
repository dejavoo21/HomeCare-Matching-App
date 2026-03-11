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
          label: 'Open Dispatch Center',
          description: 'Review urgent queue and active coordination issues.',
          to: '/admin/dispatch',
        },
        {
          label: 'Review Access Requests',
          description: 'Clear verification blockers affecting onboarding.',
          to: '/admin/access',
        },
        {
          label: 'Check Analytics',
          description: 'Review operational performance and review backlog.',
          to: '/admin/analytics',
        },
      ];

    case 'dispatch':
      return [
        {
          label: 'Open Request Queue',
          description: 'Review broader request backlog outside live dispatch.',
          to: '/admin/requests',
        },
        {
          label: 'Open Scheduling Board',
          description: 'Rebalance workload and available coverage.',
          to: '/admin/scheduling',
        },
        {
          label: 'Review Escalations',
          description: 'Check unresolved and high-risk operational items.',
          to: '/admin/escalations',
        },
      ];

    case 'scheduling':
      return [
        {
          label: 'Open Dispatch Center',
          description: 'Move from planning into live coordination.',
          to: '/admin/dispatch',
        },
        {
          label: 'Open Team',
          description: 'Review workforce availability and directory detail.',
          to: '/admin/team',
        },
        {
          label: 'Check Unresolved Items',
          description: 'Review issues affecting coverage and assignments.',
          to: '/admin/unresolved-items',
        },
      ];

    case 'analytics':
      return [
        {
          label: 'Open Dispatch Center',
          description: 'Investigate live issues behind current metrics.',
          to: '/admin/dispatch',
        },
        {
          label: 'Open Clinician Review',
          description: 'Work through note backlog and review exceptions.',
          to: '/admin/clinician-review',
        },
        {
          label: 'Open Reliability',
          description: 'Inspect technical conditions impacting platform signals.',
          to: '/admin/integrations/reliability',
        },
      ];

    default:
      return [
        {
          label: 'Open Dashboard',
          description: 'Return to the main operations hub.',
          to: '/admin/dashboard',
        },
        {
          label: 'Open Dispatch Center',
          description: 'Review live coordination and urgent work.',
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
      return 'Use the dashboard to monitor overall service delivery posture, then move into live workflows only where attention is needed.';
    case 'dispatch':
      return 'Use Dispatch Center for urgent coordination, assignment decisions, and request-linked communication.';
    case 'scheduling':
      return 'Use Scheduling Board for planning, rebalance work, recurring patterns, and assignment preparation.';
    case 'analytics':
      return 'Use Analytics to interpret performance patterns and send follow-up work back into operational pages.';
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
