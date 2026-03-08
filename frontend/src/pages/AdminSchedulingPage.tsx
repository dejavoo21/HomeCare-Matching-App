import { useState } from 'react';
import { RecurringScheduleForm } from '../components/RecurringScheduleForm';
import { SchedulingBoard } from '../components/SchedulingBoard';

export function AdminSchedulingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="pageStack">
      <SchedulingBoard key={refreshKey} />
      <RecurringScheduleForm onCreated={() => setRefreshKey((value) => value + 1)} />
    </div>
  );
}
