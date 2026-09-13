'use client';
import { useState, useEffect } from 'react';

type Stage = 'idle' | 'presenting' | 'verifying' | 'policy' | 'decision';
type StageName = 'Presentation' | 'Signature Verification' | 'Policy Evaluation' | 'Decision';
type StageStatus = 'pending' | 'checking' | 'pass' | 'fail';

interface Credential {
  id: string; type: string; holderId: string;
  claims: Record<string, any>;
  issuerId: string;
}
interface Policy {
  id: string; name: string; description: string;
}

export default function AccessPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedCredId, setSelectedCredId] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [resourceId, setResourceId] = useState('demo-resource-001');
  const [stage, setStage] = useState<Stage>('idle');
  const [stageStatuses, setStageStatuses] = useState<Record<StageName, StageStatus>>({
    'Presentation': 'pending',
    'Signature Verification': 'pending',
    'Policy Evaluation': 'pending',
    'Decision': 'pending',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/credentials/issue').then((r) => r.json()).then((d) => setCredentials(d.credentials || []));
    fetch('/api/admin/policies').then((r) => r.json()).then((d) => setPolicies(d.policies || [])).catch(() => {});
  }, []);

  const stages: StageName[] = ['Presentation', 'Signature Verification', 'Policy Evaluation', 'Decision'];

  async function handleRequest() {
    if (!selectedCredId) { setError('Please select a credential'); return; }
    setError('');
    setResult(null);
    setStageStatuses({ 'Presentation': 'pending', 'Signature Verification': 'pending', 'Policy Evaluation': 'pending', 'Decision': 'pending' });

    // Stage 1: Presentation
    setStage('presenting');
    setStageStatuses((s) => ({ ...s, 'Presentation': 'checking' }));
    await delay(800);
    setStageStatuses((s) => ({ ...s, 'Presentation': 'pass' }));

    // Stage 2: Verifying
    setStage('verifying');
    setStageStatuses((s) => ({ ...s, 'Signature Verification': 'checking' }));

    const res = await fetch('/api/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: selectedCredId,
        resourceId,
        resourceType: 'ASSET',
        policyId: selectedPolicyId || undefined,
      }),
    });
    const data = await res.json();

    if (data.stage === 'SIGNATURE_VERIFICATION' || !res.ok) {
      setStageStatuses((s) => ({ ...s, 'Signature Verification': 'fail', 'Decision': 'fail' }));
      setResult(data);
      setStage('decision');
      return;
    }

    setStageStatuses((s) => ({ ...s, 'Signature Verification': 'pass' }));
    await delay(600);

    // Stage 3: Policy
    setStage('policy');
    setStageStatuses((s) => ({ ...s, 'Policy Evaluation': 'checking' }));
    await delay(700);
    setStageStatuses((s) => ({ ...s, 'Policy Evaluation': 'pass' }));
    await delay(400);

    // Stage 4: Decision
    setStage('decision');
    const isAllow = data.decision === 'allow';
    setStageStatuses((s) => ({ ...s, 'Decision': isAllow ? 'pass' : 'fail' }));
    setResult(data);
  }

  const stageIcons: Record<StageName, string> = {
    'Presentation': '📤',
    'Signature Verification': '🔏',
    'Policy Evaluation': '⚖️',
    'Decision': '✅',
  };

  const stageColors: Record<StageStatus, string> = {
    pending: '#334155',
    checking: '#14B8A6',
    pass: '#22C55E',
    fail: '#EF4444',
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Access Request Flow
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Present a Verifiable Credential through the Verifier → Policy → Decision pipeline.
        </p>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>CREDENTIAL</label>
            <select className="input" value={selectedCredId} onChange={(e) => setSelectedCredId(e.target.value)}>
              <option value="">Select credential…</option>
              {credentials.length === 0 ? (
                <option value="" disabled>No credentials found — run the seed first</option>
              ) : (
                credentials.map((c) => (
                  <option key={c.id} value={c.id}>{c.type} (holder: {c.holderId.slice(0, 10)}…)</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>POLICY (optional)</label>
            <select className="input" value={selectedPolicyId} onChange={(e) => setSelectedPolicyId(e.target.value)}>
              <option value="">No policy (allow by default)</option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>RESOURCE ID</label>
            <input className="input" value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder="Resource ID" />
          </div>
        </div>
        {error && <div style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>⚠ {error}</div>}
        <button
          className="btn-primary"
          onClick={handleRequest}
          disabled={stage !== 'idle' && stage !== 'decision'}
          style={{ width: '100%' }}
          id="access-request-btn"
        >
          {stage === 'idle' || stage === 'decision' ? '🔐 Request Access' : 'Processing…'}
        </button>
      </div>

      {/* Pipeline visualization */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>VERIFICATION PIPELINE</h3>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
          {stages.map((stageName, i) => (
            <div key={stageName} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                {/* Icon circle */}
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  border: `2px solid ${stageColors[stageStatuses[stageName]]}`,
                  background: `${stageColors[stageStatuses[stageName]]}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                  transition: 'all 0.5s ease',
                  boxShadow: stageStatuses[stageName] !== 'pending'
                    ? `0 0 20px ${stageColors[stageStatuses[stageName]]}40` : 'none',
                }}>
                  {stageStatuses[stageName] === 'checking' ? '⟳' :
                   stageStatuses[stageName] === 'pass' ? '✓' :
                   stageStatuses[stageName] === 'fail' ? '✗' :
                   stageIcons[stageName]}
                </div>
                {/* Label */}
                <div style={{
                  fontSize: '0.7rem', fontWeight: 600, textAlign: 'center',
                  color: stageStatuses[stageName] === 'pending' ? '#475569' : stageColors[stageStatuses[stageName]],
                  transition: 'color 0.5s ease',
                  maxWidth: '90px',
                  lineHeight: 1.3,
                }}>
                  {stageName}
                </div>
              </div>
              {/* Connector line */}
              {i < stages.length - 1 && (
                <div style={{
                  flex: 0, width: '40px', height: '2px', flexShrink: 0,
                  background: stageStatuses[stageName] === 'pass' ? '#22C55E' : 'rgba(148,163,184,0.15)',
                  transition: 'background 0.5s ease',
                  marginBottom: '28px',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Result panel */}
        {result && (
          <div style={{
            marginTop: '2rem', padding: '1.25rem',
            background: result.decision === 'allow' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${result.decision === 'allow' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: '10px',
            animation: 'fadeIn 0.4s ease-out',
          }}>
            <div style={{
              fontSize: '1.25rem', fontWeight: 800,
              color: result.decision === 'allow' ? '#22C55E' : '#EF4444',
              marginBottom: '0.75rem',
            }}>
              {result.decision === 'allow' ? '✅ ACCESS GRANTED' : '❌ ACCESS DENIED'}
            </div>
            {result.credentialVerification && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className={`sig-badge ${result.credentialVerification.classicalValid ? 'sig-badge-valid' : 'sig-badge-invalid'}`}>
                  Ed25519 {result.credentialVerification.classicalValid ? '✓' : '✗'}
                </span>
                <span className={`sig-badge ${result.credentialVerification.pqValid ? 'sig-badge-valid' : 'sig-badge-invalid'}`}>
                  ML-DSA-65 {result.credentialVerification.pqValid ? '✓' : '✗'}
                </span>
              </div>
            )}
            {result.policyResult && (
              <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                <strong style={{ color: '#CBD5E1' }}>Policy reasoning:</strong> {result.policyResult.reasoning}
              </div>
            )}
            {result.reason && <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{result.reason}</div>}
            <button className="btn-secondary" style={{ marginTop: '1rem', fontSize: '0.75rem' }} onClick={() => { setStage('idle'); setResult(null); }}>
              Try another request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
