import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [identityCount, credentialCount, assetCount, ledgerCount, anomalyCount, pendingCount] =
    await Promise.all([
      prisma.identity.count(),
      prisma.credential.count(),
      prisma.asset.count(),
      prisma.ledgerEntry.count(),
      prisma.anomaly.count({ where: { isResolved: false } }),
      prisma.pendingApproval.count({ where: { status: 'PENDING' } }),
    ]);

  const recentEntries = await prisma.ledgerEntry.findMany({
    orderBy: { index: 'desc' },
    take: 8,
  });

  const stats = [
    { label: 'Identities', value: identityCount, icon: '🔑', color: '#14B8A6', href: '/register' },
    { label: 'Credentials', value: credentialCount, icon: '📜', color: '#22C55E', href: '/wallet' },
    { label: 'Assets', value: assetCount, icon: '🗄️', color: '#60A5FA', href: '/assets' },
    { label: 'Ledger Entries', value: ledgerCount, icon: '⛓️', color: '#A78BFA', href: '/ledger' },
    { label: 'Active Anomalies', value: anomalyCount, icon: '⚠️', color: anomalyCount > 0 ? '#EF4444' : '#22C55E', href: '/anomalies' },
    { label: 'Pending Approvals', value: pendingCount, icon: '✍️', color: pendingCount > 0 ? '#F59E0B' : '#22C55E', href: '/approvals' },
  ];

  const actionTypeColors: Record<string, string> = {
    DID_REGISTERED: '#14B8A6',
    VC_ISSUED: '#22C55E',
    ACCESS_GRANTED: '#22C55E',
    ACCESS_DENIED: '#EF4444',
    ASSET_MINTED: '#60A5FA',
    ASSET_TRANSFERRED: '#A78BFA',
    ASSET_FROZEN: '#F59E0B',
    ASSET_BURNED: '#EF4444',
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Provenance Dashboard
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Hybrid Post-Quantum Cryptography · Ed25519 + ML-DSA-65 + SLH-DSA-SHA2-128s · SIH26125
        </p>
      </div>

      {/* Crypto algorithm badges */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {[
          { label: 'Ed25519', desc: 'RFC 8032', color: '#22C55E' },
          { label: 'ML-DSA-65', desc: 'FIPS 204', color: '#14B8A6' },
          { label: 'SLH-DSA-SHA2-128s', desc: 'FIPS 205', color: '#60A5FA' },
          { label: 'ML-KEM-768', desc: 'FIPS 203', color: '#A78BFA' },
        ].map((algo) => (
          <div key={algo.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.3rem 0.75rem', borderRadius: '999px',
            background: `${algo.color}18`, border: `1px solid ${algo.color}40`,
            fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', color: algo.color,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: algo.color, display: 'inline-block' }} />
            {algo.label} <span style={{ opacity: 0.6 }}>· {algo.desc}</span>
          </div>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem', fontWeight: 500 }}>{stat.label}</div>
                </div>
                <div style={{ fontSize: '1.75rem' }}>{stat.icon}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent ledger activity */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Recent Ledger Activity</h2>
          <Link href="/ledger" style={{ fontSize: '0.75rem', color: '#14B8A6', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        {recentEntries.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: '2rem', fontSize: '0.875rem' }}>
            No ledger entries yet. Register an identity or seed the database.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentEntries.map((entry) => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                background: 'rgba(10, 22, 40, 0.5)', borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.06)',
                animation: 'fadeIn 0.3s ease-out',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: actionTypeColors[entry.actionType] || '#64748B',
                  boxShadow: `0 0 6px ${actionTypeColors[entry.actionType] || '#64748B'}80`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace',
                      padding: '0.1rem 0.4rem', borderRadius: '4px',
                      background: `${actionTypeColors[entry.actionType] || '#64748B'}20`,
                      color: actionTypeColors[entry.actionType] || '#64748B',
                      border: `1px solid ${actionTypeColors[entry.actionType] || '#64748B'}40`,
                    }}>{entry.actionType}</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      #{entry.index}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', flexShrink: 0 }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: '#334155', flexShrink: 0 }}>
                  {entry.hash.slice(0, 12)}…
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {[
          { href: '/register', label: 'Register Identity', desc: 'Create a hybrid keypair + DID', icon: '🔑' },
          { href: '/access', label: 'Request Access', desc: 'Present a VC through the pipeline', icon: '🔐' },
          { href: '/verify', label: 'Verify Integrity', desc: 'Audit the full ledger chain', icon: '🛡️' },
        ].map((action) => (
          <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{action.icon}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.25rem' }}>
                {action.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{action.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
