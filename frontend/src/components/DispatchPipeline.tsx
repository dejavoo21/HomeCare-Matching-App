export function DispatchPipeline() {
  return (
    <div className="pipelineCard" aria-label="Dispatch workflow">
      <div className="pipelineStep">Request Created</div>
      <div className="pipelineArrow">-&gt;</div>
      <div className="pipelineStep">Offer Sent</div>
      <div className="pipelineArrow">-&gt;</div>
      <div className="pipelineStep">Accepted</div>
      <div className="pipelineArrow">-&gt;</div>
      <div className="pipelineStep">En Route</div>
      <div className="pipelineArrow">-&gt;</div>
      <div className="pipelineStep">Visit Completed</div>
    </div>
  );
}
