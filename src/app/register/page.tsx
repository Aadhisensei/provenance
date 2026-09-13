'use client';
import { useState } from 'react';
import { ed25519 } from '@noble/curves/ed25519.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { bytesToHex, bytesToBase64 } from '@/lib/crypto/interface';
import { hybridSign, serializeSignatures, canonicalize } from '@/lib/crypto/hybrid';

type Step = 'form' | 'generating' | 'review' | 'saving' | 'done' | 'import';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('HOLDER');
  const [keys, setKeys] = useState<{
    classicalSK: string; classicalPK: string;
    pqSK: string; pqPK: string;
  } | null>(null);
  const [did, setDid] = useState('');
  const [error, setError] = useState('');
  const [importMode, setImportMode] = useState(false);
  const [importData, setImportData] = useState({ classicalSK: '', pqSK: '' });
  const [copied, setCopied] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError('Display name is required'); return; }
    setError('');
    setStep('generating');

    try {
      // Generate Ed25519 keypair (classical)
      const classicalSK = ed25519.keygen().secretKey;
      const classicalPK = ed25519.getPublicKey(classicalSK);

      // Generate ML-DSA-65 keypair (post-quantum) — this takes ~100ms
      const pqKeys = ml_dsa65.keygen();

      setKeys({
        classicalSK: bytesToHex(classicalSK),
        classicalPK: bytesToHex(classicalPK),
        pqSK: bytesToBase64(pqKeys.secretKey),
        pqPK: bytesToHex(pqKeys.publicKey),
      });
      setStep('review');
    } catch (err: any) {
      setError(err.message);
      setStep('form');
    }
  }

  async function handleRegister() {
    if (!keys) return;
    setStep('saving');
    setError('');

    try {
      const classicalSKBytes = Uint8Array.from(
        keys.classicalSK.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
      );
      const pqSKBytes = Uint8Array.from(atob(keys.pqSK), (c) => c.charCodeAt(0));

      const payload = { displayName, role, classicalPublicKey: keys.classicalPK, pqPublicKey: keys.pqPK };
      const canonical = canonicalize(payload);

      const result = hybridSign(payload, classicalSKBytes, pqSKBytes);
      const sigs = serializeSignatures(result);

      const res = await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          role,
          classicalPublicKey: keys.classicalPK,
          pqPublicKey: keys.pqPK,
          classicalSignature: sigs.classicalSignature,
          pqSignature: sigs.pqSignature,
          canonicalPayload: canonical,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setDid(data.identity.did);
      setStep('done');
    } catch (err: any) {
      setError(err.message);
      setStep('review');
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Register Identity
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Your keys are generated in this browser and never leave your device. The server only receives your public keys.
        </p>
      </div>

      {step === 'form' && (
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleGenerate}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.5rem' }}>
                DISPLAY NAME
              </label>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alice Chen"
                required
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.5rem' }}>
                ROLE
              </label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="HOLDER">Holder</option>
                <option value="ISSUER">Issuer (Clearance Authority / HR)</option>
                <option value="ADMIN">Admin</option>
                <option value="VERIFIER">Verifier</option>
              </select>
            </div>
            {error && <div style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '1rem' }}>⚠ {error}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Generate Keypair & Register
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep('import')}>
                Import Existing Keys
              </button>
            </div>
            <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.15)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.6 }}>
                <strong style={{ color: '#14B8A6' }}>What gets generated:</strong><br />
                • <strong>Ed25519</strong> keypair (32-byte private key, RFC 8032)<br />
                • <strong>ML-DSA-65</strong> keypair (4,032-byte private key, FIPS 204 — post-quantum)<br />
                • Both private keys are shown once and never sent to the server.
              </div>
            </div>
          </form>
        </div>
      )}

      {step === 'generating' && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '0.5rem' }}>Generating hybrid keypair…</div>
          <div style={{ color: '#64748B', fontSize: '0.8rem' }}>Ed25519 + ML-DSA-65 key generation in progress</div>
        </div>
      )}

      {step === 'review' && keys && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Warning banner */}
          <div style={{ padding: '1rem 1.25rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <div style={{ color: '#F59E0B', fontWeight: 700, marginBottom: '0.25rem' }}>Save these private keys now — they cannot be recovered!</div>
              <div style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Copy both private keys and store them securely. This is the only time they will be shown. If you lose them, you cannot authenticate with this identity.</div>
            </div>
          </div>

          {/* Keys */}
          {[
            { label: 'Ed25519 PRIVATE KEY (Classical)', key: keys.classicalSK, id: 'classical-sk', color: '#22C55E', algo: 'RFC 8032 · 32 bytes' },
            { label: 'ML-DSA-65 PRIVATE KEY (Post-Quantum FIPS 204)', key: keys.pqSK, id: 'pq-sk', color: '#14B8A6', algo: 'FIPS 204 · 4,032 bytes' },
          ].map((item) => (
            <div key={item.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: item.color, letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.62rem', color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>{item.algo}</div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem' }}
                  onClick={() => copyToClipboard(item.key, item.id)}
                >
                  {copied === item.id ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div className="key-box">{item.key}</div>
            </div>
          ))}

          {/* Public keys */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>PUBLIC KEYS (stored on ledger)</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Ed25519 Public Key:</div>
            <div className="hash-text" style={{ marginBottom: '0.75rem' }}>{keys.classicalPK}</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.25rem' }}>ML-DSA-65 Public Key:</div>
            <div className="hash-text">{keys.pqPK.slice(0, 64)}…</div>
          </div>

          {error && <div style={{ color: '#EF4444', fontSize: '0.8rem' }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={() => setStep('form')}>← Back</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleRegister}>
              Confirm & Register on Ledger →
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛓️</div>
          <div style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '0.5rem' }}>Appending DID to ledger…</div>
          <div style={{ color: '#64748B', fontSize: '0.8rem' }}>Verifying hybrid signature and computing hash chain entry</div>
        </div>
      )}

      {step === 'done' && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ color: '#22C55E', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Identity Registered!</h2>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem' }}>Your DID</div>
            <div className="key-box" style={{ textAlign: 'left' }}>{did}</div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.5rem' }}>
            This DID and your public keys have been registered on the hash-chained ledger with a verified hybrid dual-signature.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <a href="/wallet" className="btn-primary">Go to Wallet →</a>
            <a href="/ledger" className="btn-secondary">View Ledger</a>
          </div>
        </div>
      )}
    </div>
  );
}
