'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⬡' },
  { href: '/register', label: 'Register Identity', icon: '🔑' },
  { href: '/wallet', label: 'Wallet', icon: '💎' },
  { href: '/issuer', label: 'Issuer Console', icon: '📜' },
  { href: '/access', label: 'Access Request', icon: '🔐' },
  { href: '/assets', label: 'Asset Registry', icon: '🗄️' },
  { href: '/approvals', label: 'Approvals', icon: '✍️' },
  { href: '/ledger', label: 'Ledger Explorer', icon: '⛓️' },
  { href: '/verify', label: 'Verify Integrity', icon: '🛡️' },
  { href: '/anomalies', label: 'Anomaly Dashboard', icon: '⚠️' },
  { href: '/admin', label: 'Admin Panel', icon: '⚙️' },
  { href: '/login', label: 'Authenticate (Login)', icon: '🔑' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      width: '260px',
      background: 'rgba(5, 13, 26, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(148, 163, 184, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      zIndex: 50,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem 1.25rem',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #0D9488, #14B8A6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            flexShrink: 0,
          }}>⛓️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#F8FAFC', letterSpacing: '-0.01em' }}>
              Provenance
            </div>
            <div style={{ fontSize: '0.65rem', color: '#14B8A6', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
              SIH26125 · Post-Quantum
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#14B8A6' : '#94A3B8',
                background: isActive ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(20, 184, 166, 0.2)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '1rem', opacity: 0.9 }}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <div style={{
                  marginLeft: 'auto',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: '#14B8A6',
                  boxShadow: '0 0 6px rgba(20, 184, 166, 0.8)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '1rem 1.25rem',
        borderTop: '1px solid rgba(148, 163, 184, 0.08)',
      }}>
        <div style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1.6 }}>
          <div style={{ color: '#64748B', marginBottom: '0.25rem', fontWeight: 500 }}>Algorithms Active</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>Ed25519 · ML-DSA-65</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>SLH-DSA · ML-KEM-768</div>
        </div>
      </div>
    </aside>
  );
}
