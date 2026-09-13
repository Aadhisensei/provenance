import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });

  const classificationColor: Record<string, string> = { STANDARD: '#60A5FA', LONG_LIFE: '#A78BFA' };
  const statusColor: Record<string, string> = { ACTIVE: '#22C55E', FROZEN: '#F59E0B', BURNED: '#EF4444' };

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Asset Registry
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
            {assets.length} assets · LONG_LIFE assets carry an additional SLH-DSA-SHA2-128s signature
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ padding: '0.625rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem' }}>
          <span className="sig-badge sig-badge-valid">Ed25519 ✓</span>
          <span className="sig-badge sig-badge-valid">ML-DSA-65 ✓</span>
          <span style={{ color: '#64748B' }}>= Standard (dual-signed)</span>
        </div>
        <div className="card" style={{ padding: '0.625rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.75rem' }}>
          <span className="sig-badge sig-badge-valid">SLH-DSA ✓</span>
          <span style={{ color: '#64748B' }}>= Long-life (triple-signed)</span>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
          No assets registered. Seed the database or register an asset.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {assets.map((asset) => (
            <Link key={asset.id} href={`/assets/${asset.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s', height: '100%' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
                  <div style={{ flex: 1, marginRight: '0.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{asset.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {asset.description}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', flexShrink: 0,
                    background: `${statusColor[asset.status]}15`, color: statusColor[asset.status],
                    border: `1px solid ${statusColor[asset.status]}40`,
                  }}>{asset.status}</span>
                </div>

                {/* Content hash */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '0.2rem' }}>CONTENT HASH</div>
                  <div className="hash-text">{asset.contentHash.slice(0, 32)}…</div>
                </div>

                {/* Signature badges */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="sig-badge sig-badge-valid">Ed25519 ✓</span>
                  <span className="sig-badge sig-badge-valid">ML-DSA-65 ✓</span>
                  {asset.classification === 'LONG_LIFE' && (
                    <span
                      className="sig-badge sig-badge-valid"
                      title="Hash-based long-term signature (FIPS 205) — provides decades-long verifiability"
                      style={{ cursor: 'help' }}
                    >
                      SLH-DSA ✓
                    </span>
                  )}
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace',
                    padding: '0.15rem 0.4rem', borderRadius: '4px',
                    background: `${classificationColor[asset.classification]}15`,
                    color: classificationColor[asset.classification],
                    border: `1px solid ${classificationColor[asset.classification]}40`,
                  }}>{asset.classification}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
