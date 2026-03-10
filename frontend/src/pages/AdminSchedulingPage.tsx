import { useState } from 'react';
import { RecurringScheduleForm } from '../components/RecurringScheduleForm';
import { SchedulingBoard } from '../components/SchedulingBoard';
import AppPage from '../components/layout/AppPage';
import SectionCard from '../components/ui/SectionCard';

export function AdminSchedulingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <AppPage>
      <SchedulingBoard key={refreshKey} />
      <SectionCard
        title="Recurring scheduling"
        subtitle="Create repeat visits without leaving the scheduling workspace."
      >
        <RecurringScheduleForm onCreated={() => setRefreshKey((value) => value + 1)} />
      </SectionCard>
    </AppPage>
  );
}
