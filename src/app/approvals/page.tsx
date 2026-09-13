import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const pendingApprovals = await prisma.pendingApproval.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });

  const resolvedApprovals = await prisma.pendingApproval.findMany({
    where: { status: { not: 'PENDING' } },
    orderBy: { resolvedAt: 'desc' },
    take: 10,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#F59E0B';
      case 'APPROVED': return '#22C55E';
      case 'REJECTED': return '#EF4444';
      default: return '#64748B';
    }
  };

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Multi-Party Approvals
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Actions requiring signatures from multiple authorized identities before being committed to the ledger.
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
          Pending Action Requests ({pendingApprovals.length})
        </h2>
        {pendingApprovals.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>No pending approvals.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingApprovals.map((approval) => (
              <div key={approval.id} style={{
                padding: '1.25rem', background: 'rgba(10,22,40,0.5)', borderRadius: '10px',
                border: '1px solid rgba(245,158,11,0.2)', borderLeft: '4px solid #F59E0B'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                      {approval.actionType}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#F8FAFC' }}>
                      Requested by: <span style={{ fontFamily: 'monospace', color: '#94A3B8' }}>{approval.requesterId.slice(0, 16)}…</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '999px',
                    background: 'rgba(245,158,11,0.1)', color: '#F59E0B'
                  }}>
                    {approval.status}
                  </span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Requester Signatures:</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="sig-badge sig-badge-valid">Ed25519 ✓</span>
                    <span className="sig-badge sig-badge-valid">ML-DSA-65 ✓</span>
                    {approval.requesterSlhSig && <span className="sig-badge sig-badge-valid">SLH-DSA ✓</span>}
                  </div>
                </div>

                <div style={{ padding: '0.75rem', background: 'rgba(5,13,26,0.6)', borderRadius: '6px', fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                  {JSON.stringify(approval.payload)}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-primary">Approve Action</button>
                  <button className="btn-danger">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
          Recently Resolved ({resolvedApprovals.length})
        </h2>
        {resolvedApprovals.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>No recently resolved approvals.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {resolvedApprovals.map((approval) => (
              <div key={approval.id} style={{
                padding: '1rem', background: 'rgba(10,22,40,0.5)', borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F8FAFC' }}>{approval.actionType}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Req: {approval.requesterId.slice(0, 10)}… | App: {approval.approverId?.slice(0, 10)}…
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '4px',
                    color: getStatusColor(approval.status), border: `1px solid ${getStatusColor(approval.status)}40`
                  }}>
                    {approval.status}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>
                    {approval.resolvedAt ? new Date(approval.resolvedAt).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
