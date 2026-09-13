import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const severityStyle: Record<string, React.CSSProperties> = {
  CRITICAL: { color: '#EF4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' },
  HIGH: { color: '#F97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)' },
  MEDIUM: { color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' },
  LOW: { color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' },
};

const typeIcons: Record<string, string> = {
  REPEATED_ACCESS_FAILURE: '🔁',
  INVALID_SIGNATURE: '🔓',
  TAMPER_DETECTED: '🚨',
  UNAUTHORIZED_ACTION: '⛔',
};

export default async function AnomaliesPage() {
  const [unresolved, resolved] = await Promise.all([
    prisma.anomaly.findMany({ where: { isResolved: false }, orderBy: { detectedAt: 'desc' } }),
    prisma.anomaly.findMany({ where: { isResolved: true }, orderBy: { resolvedAt: 'desc' }, take: 10 }),
  ]);

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Anomaly Dashboard
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          {unresolved.length} active anomalies · Flagged by automated threshold detection and signature verification
        </p>
      </div>

      {/* Active anomalies */}
      {unresolved.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <div style={{ color: '#22C55E', fontWeight: 600 }}>No active anomalies</div>
          <div style={{ color: '#64748B', fontSize: '0.8rem', marginTop: '0.5rem' }}>The system is operating normally.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {unresolved.map((anomaly) => (
            <div key={anomaly.id} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${severityStyle[anomaly.severity]?.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem' }}>{typeIcons[anomaly.type] || '⚠️'}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.9rem' }}>{anomaly.type.replace(/_/g, ' ')}</div>
                    {anomaly.identityId && (
                      <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                        Identity: {anomaly.identityId.slice(0, 20)}…
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px',
                    ...severityStyle[anomaly.severity],
                  }}>{anomaly.severity}</span>
                  <form action={async () => {
                    'use server';
                    await prisma.anomaly.update({ where: { id: anomaly.id }, data: { isResolved: true, resolvedAt: new Date() } });
                  }}>
                    <button type="submit" className="btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                      Resolve
                    </button>
                  </form>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.5rem' }}>{anomaly.description}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569' }}>{new Date(anomaly.detectedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recently resolved */}
      {resolved.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B', marginBottom: '0.75rem' }}>Recently Resolved</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {resolved.map((a) => (
              <div key={a.id} style={{ padding: '0.75rem 1rem', background: 'rgba(10,22,40,0.4)', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.06)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span>✓</span>
                <span style={{ flex: 1, fontSize: '0.8rem', color: '#64748B' }}>{a.type.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '0.7rem', color: '#475569' }}>{a.resolvedAt ? new Date(a.resolvedAt).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
