'use client';
import { useState, useEffect, useCallback } from 'react';

interface Policy {
  id: string;
  name: string;
  description: string;
  resourceType: string;
  rules: string;
  version: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  // Create policy modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newResource, setNewResource] = useState('ASSET');
  const [newRules, setNewRules] = useState(
    JSON.stringify([{ field: 'clearanceLevel', operator: 'equals', value: 'SECRET', required: true }], null, 2)
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Reset DB state
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/policies');
      const data = await res.json();
      setPolicies(data.policies || []);
    } catch {
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);

  async function handleCreatePolicy(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      let parsedRules;
      try { parsedRules = JSON.parse(newRules); } catch {
        setCreateError('Rules must be valid JSON.'); setCreating(false); return;
      }
      const res = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, resourceType: newResource, rules: parsedRules }),
      });
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || 'Failed to create policy'); setCreating(false); return; }
      setShowCreate(false);
      setNewName(''); setNewDesc(''); setNewResource('ASSET');
      setNewRules(JSON.stringify([{ field: 'clearanceLevel', operator: 'equals', value: 'SECRET', required: true }], null, 2));
      await loadPolicies();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleReset() {
    if (!confirm('⚠️ This will WIPE ALL data from the database. This cannot be undone. Continue?')) return;
    setResetting(true);
    setResetMsg('');
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const data = await res.json();
      setResetMsg(data.message || data.error || 'Done');
      await loadPolicies();
    } catch (err: any) {
      setResetMsg(err.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
          Admin Panel
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Manage access policies and system configuration.
        </p>
      </div>

      {/* Policies Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#F8FAFC' }}>
            Access Policies ({policies.length})
          </h2>
          <button className="btn-primary" onClick={() => { setShowCreate(true); setCreateError(''); }}>
            + Create Policy
          </button>
        </div>

        {loading ? (
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>Loading policies…</p>
        ) : policies.length === 0 ? (
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>No policies defined. Click &quot;Create Policy&quot; to add one.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {policies.map((policy) => (
              <div key={policy.id} style={{
                padding: '1.25rem', background: 'rgba(10,22,40,0.5)', borderRadius: '10px',
                border: '1px solid rgba(148,163,184,0.08)', minWidth: 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC' }}>{policy.name}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>{policy.description}</p>
                  </div>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px',
                    background: policy.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: policy.isActive ? '#22C55E' : '#EF4444',
                    border: `1px solid ${policy.isActive ? '#22C55E' : '#EF4444'}40`,
                    flexShrink: 0,
                  }}>
                    {policy.isActive ? 'ACTIVE' : 'INACTIVE'} (v{policy.version})
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>
                  Target Resource: <span style={{ color: '#14B8A6' }}>{policy.resourceType}</span>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(5,13,26,0.8)', borderRadius: '6px', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: '0.75rem', color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {(() => { try { return JSON.stringify(JSON.parse(policy.rules), null, 2); } catch { return policy.rules; } })()}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#EF4444', marginBottom: '1rem' }}>Danger Zone</h2>
        <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '1rem' }}>
          System reset tools. These actions are irreversible and will wipe all data from the ledger.
        </p>
        <button className="btn-danger" onClick={handleReset} disabled={resetting}>
          {resetting ? 'Wiping database…' : '🗑 Reset Database (Wipe All Data)'}
        </button>
        {resetMsg && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.625rem', borderRadius: '6px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
            {resetMsg}
          </div>
        )}
      </div>

      {/* Create Policy Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="card" style={{ width: '100%', maxWidth: '560px', padding: '2rem', animation: 'fadeIn 0.2s ease-out' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.5rem' }}>
              Create Access Policy
            </h2>
            <form onSubmit={handleCreatePolicy}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>Policy Name</label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Top Secret Clearance" required />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>Description</label>
                <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description of this policy" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>Resource Type</label>
                <select className="input" value={newResource} onChange={e => setNewResource(e.target.value)}>
                  <option>ASSET</option>
                  <option>CLEARANCE_AREA</option>
                  <option>DOCUMENT</option>
                  <option>API</option>
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.4rem' }}>
                  Rules (JSON array)
                </label>
                <textarea
                  className="input"
                  value={newRules}
                  onChange={e => setNewRules(e.target.value)}
                  rows={7}
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', resize: 'vertical' }}
                />
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.3rem' }}>
                  Each rule: {`{ "field": "...", "operator": "equals|in|gte|lte", "value": "...", "required": true }`}
                </div>
              </div>
              {createError && (
                <div style={{ marginBottom: '1rem', padding: '0.625rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '0.8rem', color: '#EF4444' }}>
                  {createError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 1 }}>
                  {creating ? 'Creating…' : 'Create Policy'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
