import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function IssuerPage() {
  const issuers = await prisma.identity.findMany({ where: { role: 'ISSUER' } });
  const holders = await prisma.identity.findMany({ where: { role: 'HOLDER' } });
  const issuedCreds = await prisma.credential.findMany({ orderBy: { issuedAt: 'desc' }, take: 20 });

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Issuer Console
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Issue Verifiable Credentials to registered holders. All credentials are hybrid dual-signed (Ed25519 + ML-DSA-65).
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Issuers', value: issuers.length, color: '#14B8A6' },
          { label: 'Holders', value: holders.length, color: '#60A5FA' },
          { label: 'Credentials Issued', value: issuedCreds.length, color: '#22C55E' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Info panel about issuance process */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #14B8A6' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#14B8A6', marginBottom: '0.75rem' }}>How Credential Issuance Works</div>
        <div style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.7 }}>
          1. <strong style={{ color: '#CBD5E1' }}>Select an Issuer</strong> identity (Clearance Authority / HR) and a Holder<br />
          2. <strong style={{ color: '#CBD5E1' }}>Define claims</strong> (clearance level, department, validity period)<br />
          3. The issuer's client <strong style={{ color: '#CBD5E1' }}>signs the claim payload</strong> with both Ed25519 (classical) and ML-DSA-65 (PQC)<br />
          4. Both signatures are verified server-side before the VC is created<br />
          5. A <strong style={{ color: '#CBD5E1' }}>VC_ISSUED ledger entry</strong> is appended with an immutable hash chain link
        </div>
        <div style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: '#475569' }}>
          For the live demo: use the Register page to create new identities with keys, then issue credentials via the API. Pre-seeded credentials can be viewed below.
        </div>
      </div>

      {/* Issued credentials list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Issued Credentials</h2>
        </div>
        {issuedCreds.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>No credentials yet. Seed the database.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Holder</th>
                <th>Issuer</th>
                <th>Issued</th>
                <th>Signatures</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {issuedCreds.map((cred) => (
                <tr key={cred.id}>
                  <td>
                    <span style={{ color: '#22C55E', fontWeight: 600, fontSize: '0.8rem' }}>{cred.type}</span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#64748B' }}>
                      {cred.holderId.slice(0, 16)}…
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#64748B' }}>
                      {cred.issuerId.slice(0, 16)}…
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {new Date(cred.issuedAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span className="sig-badge sig-badge-valid">Ed25519 ✓</span>
                      <span className="sig-badge sig-badge-valid">ML-DSA ✓</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.72rem', color: cred.isRevoked ? '#EF4444' : '#22C55E' }}>
                      {cred.isRevoked ? '⛔ Revoked' : '✓ Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
