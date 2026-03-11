import { Link } from 'react-router-dom';
import { useState } from 'react';
import { RecurringScheduleForm } from '../components/RecurringScheduleForm';
import { SchedulingBoard } from '../components/SchedulingBoard';
import AppPage from '../components/layout/AppPage';
import AdminPageHeader from '../components/ui/AdminPageHeader';
import AdminStatStrip from '../components/ui/AdminStatStrip';
import SectionCard from '../components/ui/SectionCard';

export function AdminSchedulingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppPage className="schedulingPage">
      <AdminPageHeader
        eyebrow="Workforce planning"
        title="Scheduling Board"
        description="Assign visits, balance coverage, manage recurring schedules, and resolve operational conflicts from one planning surface."
      >
        <AdminStatStrip
          items={[
            { label: 'Scheduled today', value: 126, meta: 'Visits on the board' },
            { label: 'Unassigned', value: 5, meta: 'Needs coverage' },
            { label: 'At risk', value: 8, meta: 'Conflict or authorization pressure' },
            { label: 'Recurring plans', value: 14, meta: 'Repeat schedule templates' },
          ]}
        />
      </AdminPageHeader>
      <SchedulingBoard key={refreshKey} />
      <section className="schedulingBottomStrip" aria-label="Scheduling guidance">
        <div className="schedulingBottomStripText">
          <div className="schedulingBottomStripTitle">Planning guidance</div>
          <div className="schedulingBottomStripBody">
            Use the board for assignment and rebalance work. Use Dispatch Center for live coordination and Request Queue for broader status administration.
          </div>
        </div>

        <div className="pageActions">
          <Link to="/admin/dispatch" className="btn">
            Open Dispatch Center
          </Link>
          <Link to="/admin/requests" className="btn">
            Open Request Queue
          </Link>
        </div>
      </section>
      <SectionCard
        title="Recurring scheduling"
        subtitle="Create repeat visits without leaving the scheduling workspace."
      >
        <RecurringScheduleForm onCreated={() => setRefreshKey((value) => value + 1)} />
      </SectionCard>
    </AppPage>
  );
}
