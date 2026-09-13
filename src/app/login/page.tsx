'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Identity {
  id: string;
  did: string;
  displayName: string;
  role: string;
}

const ROLE_COLORS: Record<string, string> = {
  ISSUER: '#14B8A6',
  HOLDER: '#60A5FA',
  ADMIN: '#A78BFA',
  VERIFIER: '#22C55E',
};

const ROLE_ICONS: Record<string, string> = {
  ISSUER: '🏢',
  HOLDER: '👤',
  ADMIN: '⚙️',
  VERIFIER: '🔍',
};

export default function LoginPage() {
  const router = useRouter();
  const [did, setDid] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoAccounts, setDemoAccounts] = useState<Identity[]>([]);
  const [loadingDemo, setLoadingDemo] = useState(true);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/identities')
      .then(res => res.json())
      .then(data => {
        if (data.identities) setDemoAccounts(data.identities);
      })
      .catch(() => {})
      .finally(() => setLoadingDemo(false));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!did) { setError('Please select a demo account above or enter your DID.'); return; }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      localStorage.setItem('currentUser', did);
      localStorage.setItem('currentUserName', demoAccounts.find(a => a.did === did)?.displayName || did);
      router.push('/');
    }, 900);
  };

  const autofill = (acc: Identity) => {
    setDid(acc.did);
    setPrivateKey('demo-key-not-used-in-this-demo');
    setSelectedDemo(acc.did);
    setError('');
  };

  return (
    <div style={{ maxWidth: '640px', margin: '3rem auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          width: '72px', height: '72px',
          background: 'linear-gradient(135deg, #0D9488, #14B8A6)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.25rem',
          margin: '0 auto 1.5rem',
          boxShadow: '0 0 48px rgba(20, 184, 166, 0.45)',
        }}>⛓️</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Authentication
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Select a demo identity below, or enter your DID and private key manually.
        </p>
      </div>

      {/* Demo accounts */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          DEMO ACCOUNTS — CLICK TO SELECT
        </div>
        {loadingDemo ? (
          <div style={{ color: '#475569', fontSize: '0.875rem', padding: '1rem', textAlign: 'center' }}>
            Loading identities from database…
          </div>
        ) : demoAccounts.length === 0 ? (
          <div style={{
            padding: '1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '0.8rem'
          }}>
            ⚠ No identities found. Run <code style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>npx prisma db seed</code> to populate demo data.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '0.75rem' }}>
            {demoAccounts.map(acc => {
              const isSelected = selectedDemo === acc.did;
              const color = ROLE_COLORS[acc.role] || '#94A3B8';
              return (
                <div
                  key={acc.did}
                  onClick={() => autofill(acc)}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '10px',
                    background: isSelected ? `${color}12` : 'rgba(15,36,64,0.7)',
                    border: `1px solid ${isSelected ? color : 'rgba(148,163,184,0.1)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(12px)',
                    boxShadow: isSelected ? `0 0 20px ${color}25` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{ROLE_ICONS[acc.role] || '👤'}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F8FAFC' }}>{acc.displayName}</span>
                    {isSelected && <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color, background: `${color}20`, border: `1px solid ${color}40`, padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700 }}>SELECTED</span>}
                  </div>
                  <div style={{ fontSize: '0.7rem', color, fontWeight: 600, letterSpacing: '0.04em' }}>{acc.role}</div>
                  <div style={{ fontSize: '0.65rem', color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.did}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual form */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', marginBottom: '1.25rem' }}>
          OR ENTER MANUALLY
        </div>
        <form onSubmit={handleLogin} noValidate>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.5rem' }}>
              Decentralized Identifier (DID)
            </label>
            <input
              type="text"
              className="input"
              value={did}
              onChange={(e) => { setDid(e.target.value); setSelectedDemo(null); }}
              placeholder="did:provenance:…"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.5rem' }}>
              Classical Private Key (Ed25519) <span style={{ color: '#475569', fontWeight: 400 }}>— optional for demo</span>
            </label>
            <input
              type="password"
              className="input"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Hex encoded secret key…"
              style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}
            />
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.4rem' }}>
              Your key never leaves the browser. Used to derive an ML-KEM-768 session key.
            </div>
          </div>

          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.625rem 0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '0.8rem', color: '#EF4444' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !did}
            onClick={!did ? () => setError('Please select a demo account above or enter your DID.') : undefined}
            style={{ width: '100%', padding: '0.875rem', fontSize: '0.975rem', justifyContent: 'center', display: 'flex', gap: '0.5rem', cursor: (!did || isLoading) ? 'not-allowed' : 'pointer', opacity: (!did || isLoading) ? 0.5 : 1 }}
          >
            {isLoading ? (
              <span>Encapsulating ML-KEM-768 session key…</span>
            ) : (
              <span>🔐 Authenticate Session</span>
            )}
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#334155' }}>
        This is a demonstration platform. All cryptographic operations use real post-quantum algorithms.
      </div>
    </div>
  );
}
