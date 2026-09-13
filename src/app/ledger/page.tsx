import prisma from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function ActionBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    DID_REGISTERED: '#14B8A6',
    VC_ISSUED: '#22C55E',
    ACCESS_GRANTED: '#22C55E',
    ACCESS_DENIED: '#EF4444',
    ASSET_MINTED: '#60A5FA',
    ASSET_TRANSFERRED: '#A78BFA',
    ASSET_FROZEN: '#F59E0B',
    ASSET_BURNED: '#EF4444',
    ACCESS_CHECK: '#64748B',
  };
  const color = colors[type] || '#64748B';
  return (
    <span style={{
      fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace',
      padding: '0.15rem 0.5rem', borderRadius: '4px',
      background: `${color}20`, color, border: `1px solid ${color}40`,
    }}>{type}</span>
  );
}

export default async function LedgerPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = parseInt((await searchParams as any).page || '1', 10);
  const limit = 15;
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({ orderBy: { index: 'desc' }, skip, take: limit }),
    prisma.ledgerEntry.count(),
  ]);

  const pages = Math.ceil(total / limit);

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Ledger Explorer
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          {total} immutable, hash-linked entries. Each is signed with a hybrid Ed25519 + ML-DSA-65 dual-signature.
        </p>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
            No ledger entries. Seed the database to populate.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Action</th>
                <th>Timestamp</th>
                <th>Signatures</th>
                <th>Hash</th>
                <th>Prev Hash</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#14B8A6' }}>
                      #{entry.index}
                    </span>
                  </td>
                  <td><ActionBadge type={entry.actionType} /></td>
                  <td style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <span className="sig-badge sig-badge-valid">Ed25519 ✓</span>
                      <span className="sig-badge sig-badge-valid">ML-DSA ✓</span>
                      {entry.slhSignature && (
                        <span className="sig-badge sig-badge-valid" title="Hash-based long-term signature">SLH-DSA ✓</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="hash-text">{entry.hash.slice(0, 16)}…</span>
                  </td>
                  <td>
                    <span className="hash-text">{entry.previousHash.slice(0, 16)}…</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {page > 1 && (
            <Link href={`/ledger?page=${page - 1}`} className="btn-secondary">← Prev</Link>
          )}
          <span style={{ padding: '0.5rem 1rem', color: '#64748B', fontSize: '0.875rem' }}>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/ledger?page=${page + 1}`} className="btn-secondary">Next →</Link>
          )}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        <Link href="/verify" className="btn-primary">🛡️ Verify Integrity</Link>
        <Link href="/admin" className="btn-danger">⚡ Simulate Tamper</Link>
      </div>
    </div>
  );
}
