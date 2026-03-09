import { AdminClinicianNotesReview } from '../components/AdminClinicianNotesReview';

export function AdminClinicianReviewPage() {
  return (
    <main className="pageStack" role="main" aria-label="Clinician documentation review">
      <section className="pageHeaderBlock">
        <div className="pageHeaderRow">
          <div>
            <h1 className="pageTitle">Clinician Documentation Review</h1>
            <p className="subtitle">
              Review visit notes, outcomes, follow-up requirements, and escalations from
              clinicians.
            </p>
          </div>
        </div>
      </section>

      <AdminClinicianNotesReview />
    </main>
  );
}
