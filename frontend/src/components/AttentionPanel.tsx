type AttentionRequest = {
  urgency?: string;
  status?: string;
  offerExpiresAt?: string | null;
};

export function AttentionPanel({ requests }: { requests: AttentionRequest[] }) {
  const expiring = requests.filter((request) => {
    if (!request.offerExpiresAt || String(request.status).toLowerCase() !== 'offered') {
      return false;
    }

    const diff = new Date(request.offerExpiresAt).getTime() - Date.now();
    return diff > 0 && diff < 60_000;
  });

  const critical = requests.filter(
    (request) =>
      String(request.urgency).toLowerCase() === 'critical' &&
      String(request.status).toLowerCase() !== 'completed' &&
      String(request.status).toLowerCase() !== 'cancelled'
  );

  return (
    <div className="attentionCard">
      <h3 className="attentionTitle">Dispatch Attention</h3>

      <div className="attentionList">
        <div>
          Critical requests: <b>{critical.length}</b>
        </div>

        <div>
          Offers expiring soon: <b>{expiring.length}</b>
        </div>
      </div>
    </div>
  );
}
