import React, { useState } from 'react';
import { Store, ShieldCheck, Zap, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../app/providers';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        await register({ email, password, fullName, businessName });
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setEmail('owner@apexmart.com');
    setPassword('Password123!');
    setError(null);
    setLoading(true);
    try {
      await login({ email: 'owner@apexmart.com', password: 'Password123!' });
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        className="pos-card"
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left hero banner */}
        <div
          style={{
            background: 'linear-gradient(145deg, #0f172a, #1e293b)',
            color: '#ffffff',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '10px',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                marginBottom: 24,
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
              }}
            >
              <Sparkles size={26} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
              Universal POS
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>
              The high-performance, multi-tenant Point of Sale engine. Built with immutable inventory ledgers, authoritative pricing, cash reconciliation, and branch isolation.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#cbd5e1' }}>
              <ShieldCheck size={18} color="#10b981" />
              <span>Enterprise-grade Multi-Tenant RBAC & Branch Scope</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#cbd5e1' }}>
              <Zap size={18} color="#f59e0b" />
              <span>Atomic Idempotent Checkout & Stock Locking</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: '#cbd5e1' }}>
              <CheckCircle2 size={18} color="#38bdf8" />
              <span>Accurate COGS, Margin Analysis & Register Reconciliation</span>
            </div>
          </div>
        </div>

        {/* Right login/register form */}
        <div style={{ padding: 48, background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              {isRegistering ? 'Create Business Account' : 'Welcome Back'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              {isRegistering
                ? 'Initialize your business workspace and branch'
                : 'Sign in to access your register and dashboard'}
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '0.85rem',
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isRegistering && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Alice Founder"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Store / Business Name
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Apex Supermart"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="owner@apexmart.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: 8 }}
            >
              {loading ? 'Processing...' : isRegistering ? 'Register Store' : 'Sign In'}
            </button>
          </form>

          {!isRegistering && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={handleDemoSignIn}
                className="btn btn-secondary"
                style={{ width: '100%', borderColor: '#cbd5e1' }}
              >
                Sign in with Demo Store (owner@apexmart.com)
              </button>
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
            >
              {isRegistering
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create Business"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
