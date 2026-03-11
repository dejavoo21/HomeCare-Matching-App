import { Link } from 'react-router-dom';
import { useState } from 'react';
import { RecurringScheduleForm } from '../components/RecurringScheduleForm';
import { SchedulingBoard } from '../components/SchedulingBoard';
import AppPage from '../components/layout/AppPage';
import SectionCard from '../components/ui/SectionCard';

export function AdminSchedulingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppPage className="schedulingPage">
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
