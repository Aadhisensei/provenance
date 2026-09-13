'use client';
import { useState } from 'react';

interface EntryResult {
  index: number; valid: boolean; previousHashValid: boolean; hashValid: boolean;
  storedHash: string; recomputedHash: string; expectedPreviousHash: string; storedPreviousHash: string;
}

interface VerifyResult {
  chainValid: boolean; totalEntries: number; firstFailureIndex: number | null; entries: EntryResult[];
}

export default function VerifyClient({ totalEntries }: { totalEntries: number }) {
  const [state, setState] = useState<'idle' | 'verifying' | 'done'>('idle');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [tampering, setTampering] = useState(false);
  const [tamperIndex, setTamperIndex] = useState(0);
  const [tamperMsg, setTamperMsg] = useState('');

  async function runVerification() {
    setState('verifying');
    setProgress(0);

    // Simulate progressive verification
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 12, 90));
    }, 200);

    const res = await fetch('/api/ledger/verify');
    const data: VerifyResult = await res.json();

    clearInterval(interval);
    setProgress(100);
    setTimeout(() => {
      setResult(data);
      setState('done');
    }, 300);
  }

  async function simulateTamper() {
    setTampering(true);
    setTamperMsg('');
    try {
      const res = await fetch('/api/admin/tamper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIndex: tamperIndex }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTamperMsg(`❌ Error: ${data.error || 'Unknown error'}`);
      } else {
        setTamperMsg(`✅ ${data.message}`);
      }
    } catch (err: unknown) {
      setTamperMsg(`❌ Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTampering(false);
      setResult(null);
      setState('idle');
    }
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Ledger Integrity Verification
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Recomputes SHA-256 hashes for all {totalEntries} ledger entries and verifies the hash chain is unbroken.
        </p>
      </div>

      {/* Main verify card */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        {state === 'idle' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛡️</div>
            <div style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.1rem' }}>
              {totalEntries} ledger entries ready for verification
            </div>
            <div style={{ color: '#64748B', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              Each entry's SHA-256 hash will be recomputed and compared against the stored hash and the chain linkage.
            </div>
            <button className="btn-primary" onClick={runVerification} id="verify-btn" style={{ padding: '0.75rem 2.5rem', fontSize: '1rem' }}>
              Verify Ledger Integrity
            </button>
          </div>
        )}

        {state === 'verifying' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 1s ease infinite' }}>⟳</div>
            <div style={{ color: '#14B8A6', fontWeight: 600, marginBottom: '1rem' }}>Verifying hash chain…</div>
            <div style={{ background: 'rgba(10,22,40,0.8)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '999px',
                background: 'linear-gradient(90deg, #0D9488, #14B8A6)',
                width: `${progress}%`, transition: 'width 0.2s ease',
              }} />
            </div>
            <div style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '0.5rem' }}>{progress}% complete</div>
          </div>
        )}

        {state === 'done' && result && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* Overall result */}
            <div style={{
              padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem',
              background: result.chainValid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.chainValid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{ fontSize: '2.5rem' }}>{result.chainValid ? '✅' : '🚨'}</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: result.chainValid ? '#22C55E' : '#EF4444' }}>
                  {result.chainValid ? 'CHAIN INTACT — No tampering detected' : `TAMPER DETECTED at entry #${result.firstFailureIndex}`}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                  {result.totalEntries} entries verified
                  {!result.chainValid && ` — hash mismatch starting at index ${result.firstFailureIndex}`}
                </div>
              </div>
            </div>

            {/* Entry cascade */}
            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {result.entries.map((entry, i) => (
                <div key={entry.index} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.875rem',
                  background: entry.valid ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${entry.valid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.25)'}`,
                  borderRadius: '6px',
                  animation: `cascade 0.3s ease-out ${i * 30}ms both`,
                }}>
                  <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{entry.valid ? '✓' : '✗'}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#64748B', flexShrink: 0 }}>
                    #{entry.index}
                  </span>
                  <span className="hash-text" style={{ flex: 1 }}>{entry.storedHash.slice(0, 24)}…</span>
                  {!entry.valid && (
                    <span style={{ fontSize: '0.65rem', color: '#EF4444', flexShrink: 0 }}>
                      {!entry.hashValid ? 'HASH MISMATCH' : 'CHAIN BROKEN'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button className="btn-secondary" style={{ marginTop: '1rem', fontSize: '0.8rem' }} onClick={() => setState('idle')}>
              ← Run again
            </button>
          </div>
        )}
      </div>

      {/* Tamper simulation */}
      <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <div>
            <div style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.9rem' }}>DEMO: Simulate Tamper</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Directly modifies a ledger entry in the database (bypassing signatures) to prove the verification catches it.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '0.3rem' }}>ENTRY INDEX</label>
            <input
              type="number" className="input" value={tamperIndex}
              onChange={(e) => setTamperIndex(parseInt(e.target.value, 10))}
              style={{ width: '100px' }} min={0}
            />
          </div>
          <button
            className="btn-danger"
            onClick={simulateTamper}
            disabled={tampering}
            style={{ marginTop: '1.1rem' }}
            id="tamper-btn"
          >
            {tampering ? 'Tampering…' : 'Tamper Entry'}
          </button>
        </div>
        {tamperMsg && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#F59E0B', padding: '0.5rem', background: 'rgba(245,158,11,0.08)', borderRadius: '6px' }}>
            {tamperMsg} — Now click "Verify Ledger Integrity" above to catch it.
          </div>
        )}
      </div>
    </div>
  );
}
