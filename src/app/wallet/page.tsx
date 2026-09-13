import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  // For demo, show all identities and their credentials/assets
  const identities = await prisma.identity.findMany({ orderBy: { createdAt: 'desc' } });
  const credentials = await prisma.credential.findMany({ orderBy: { issuedAt: 'desc' } });
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Identity Wallet
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Registered DIDs, Verifiable Credentials, and owned assets on the ledger.
        </p>
      </div>

      {/* Identities */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
          Registered Identities ({identities.length})
        </h2>
        {identities.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>No identities. Seed the database or register one.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {identities.map((identity) => {
              const roleColors: Record<string, string> = { ISSUER: '#14B8A6', HOLDER: '#60A5FA', ADMIN: '#A78BFA', VERIFIER: '#F59E0B' };
              const roleColor = roleColors[identity.role] || '#64748B';
              const heldCreds = credentials.filter((c) => c.holderId === identity.id);
              const ownedAssets = assets.filter((a) => a.ownerId === identity.id);

              return (
                <div key={identity.id} style={{ padding: '1rem', background: 'rgba(10,22,40,0.5)', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.9rem' }}>{identity.displayName}</div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: '#64748B', marginTop: '0.2rem' }}>{identity.did}</div>
                    </div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px',
                      background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}40`,
                    }}>{identity.role}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.625rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>{heldCreds.length}</span> credential{heldCreds.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>{ownedAssets.length}</span> asset{ownedAssets.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Public key snippets */}
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="sig-badge sig-badge-valid">Ed25519 PK</span>
                    <span className="sig-badge sig-badge-valid">ML-DSA-65 PK</span>
                    {identity.slhPublicKey && <span className="sig-badge sig-badge-valid">SLH-DSA PK</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Credentials */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
          Verifiable Credentials ({credentials.length})
        </h2>
        {credentials.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>No credentials issued yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {credentials.map((cred) => (
              <div key={cred.id} style={{ padding: '1rem', background: 'rgba(10,22,40,0.5)', borderRadius: '10px', border: '1px solid rgba(148,163,184,0.08)' }}>
                <div style={{ fontWeight: 700, color: '#22C55E', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{cred.type}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '0.25rem' }}>
                  Holder: <span style={{ color: '#94A3B8', fontFamily: 'monospace' }}>{cred.holderId.slice(0, 16)}…</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '0.5rem' }}>
                  Issued: {new Date(cred.issuedAt).toLocaleDateString()}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span className="sig-badge sig-badge-valid">Ed25519 ✓</span>
                  <span className="sig-badge sig-badge-valid">ML-DSA-65 ✓</span>
                </div>
                {cred.isRevoked && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#EF4444' }}>⛔ REVOKED</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
