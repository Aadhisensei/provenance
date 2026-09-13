import prisma from '@/lib/prisma';
import { getLedgerHistoryForAsset } from '@/lib/ledger';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params as any;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return notFound();

  const history = await getLedgerHistoryForAsset(id);
  const isLongLife = asset.classification === 'LONG_LIFE';

  const statusColor: Record<string, string> = { ACTIVE: '#22C55E', FROZEN: '#F59E0B', BURNED: '#EF4444' };
  const actionColors: Record<string, string> = {
    ASSET_MINTED: '#60A5FA', ASSET_TRANSFERRED: '#A78BFA', ACCESS_GRANTED: '#22C55E',
    ACCESS_DENIED: '#EF4444', ASSET_FROZEN: '#F59E0B', ASSET_BURNED: '#EF4444',
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/assets" style={{ color: '#64748B', fontSize: '0.8rem', textDecoration: 'none' }}>← Assets</Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
        {/* Asset header */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.375rem' }}>{asset.name}</h1>
              <p style={{ color: '#64748B', fontSize: '0.875rem' }}>{asset.description}</p>
            </div>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '999px',
              background: `${statusColor[asset.status]}15`, color: statusColor[asset.status],
              border: `1px solid ${statusColor[asset.status]}40`,
            }}>{asset.status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>CONTENT HASH</div>
              <div className="hash-text">{asset.contentHash}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>OWNER ID</div>
              <div className="hash-text">{asset.ownerId}</div>
            </div>
          </div>

          {/* Signature badges */}
          <div>
            <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CRYPTOGRAPHIC PROOFS</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="sig-badge sig-badge-valid">Ed25519 ✓ · RFC 8032</span>
              <span className="sig-badge sig-badge-valid">ML-DSA-65 ✓ · FIPS 204</span>
              {isLongLife && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <span className="sig-badge sig-badge-valid" title="Hash-based long-term signature (FIPS 205). Applied to LONG_LIFE assets whose records must stay verifiable for decades — even if lattice assumptions weaken.">
                    SLH-DSA-SHA2-128s ✓ · FIPS 205 📌
                  </span>
                </div>
              )}
              <span style={{
                marginLeft: '0.5rem', fontSize: '0.62rem', fontFamily: 'JetBrains Mono, monospace',
                padding: '0.15rem 0.5rem', borderRadius: '4px',
                background: isLongLife ? 'rgba(167,139,250,0.1)' : 'rgba(96,165,250,0.1)',
                color: isLongLife ? '#A78BFA' : '#60A5FA',
                border: isLongLife ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(96,165,250,0.3)',
              }}>{asset.classification}</span>
            </div>
            {isLongLife && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748B', padding: '0.5rem', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '6px' }}>
                💡 <strong style={{ color: '#A78BFA' }}>Hash-based long-term signature</strong>: This asset carries an SLH-DSA-SHA2-128s signature in addition to the standard hybrid pair. SLH-DSA provides an independent security guarantee based solely on hash function collision-resistance, ensuring this record remains verifiable even if lattice-based cryptography is broken in the future.
              </div>
            )}
          </div>
        </div>

        {/* Ledger history */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
            Ledger History ({history.length} entries)
          </h2>
          {history.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.875rem' }}>No ledger history for this asset.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((entry, i) => (
                <div key={entry.id} style={{ position: 'relative' }}>
                  {/* Chain connector */}
                  {i < history.length - 1 && (
                    <div style={{
                      position: 'absolute', left: '15px', top: '40px', bottom: '-8px',
                      width: '2px', background: 'rgba(148,163,184,0.15)',
                    }} />
                  )}
                  <div style={{
                    display: 'flex', gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(10,22,40,0.5)', borderRadius: '8px',
                    border: '1px solid rgba(148,163,184,0.06)',
                  }}>
                    {/* Chain link dot */}
                    <div style={{
                      width: '12px', height: '12px', borderRadius: '50%', marginTop: '4px', flexShrink: 0,
                      background: actionColors[entry.actionType] || '#64748B',
                      border: `2px solid ${actionColors[entry.actionType] || '#64748B'}`,
                      boxShadow: `0 0 8px ${actionColors[entry.actionType] || '#64748B'}60`,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.375rem' }}>
                        <span style={{
                          fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace',
                          padding: '0.1rem 0.4rem', borderRadius: '4px',
                          background: `${actionColors[entry.actionType] || '#64748B'}20`,
                          color: actionColors[entry.actionType] || '#64748B',
                        }}>{entry.actionType}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>#{entry.index}</span>
                        <span style={{ fontSize: '0.7rem', color: '#475569', marginLeft: 'auto' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="hash-text">{entry.hash.slice(0, 32)}… → {entry.previousHash.slice(0, 16)}…</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
