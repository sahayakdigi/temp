import React, { useState } from 'react';
import { Package, Eye, EyeOff, Lock, Mail, ChevronRight, Truck, Layers, BarChart3, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Authenticate with Firebase Auth (or fallback if Firebase Auth is unconfigured)
      let fbUser = null;

      const lowerEmail = email.toLowerCase().trim();
      const predefined = {
        'admin@temp.in': 'admin123',
        'delhi.mgr@temp.in': 'pass123',
        'booking@temp.in': 'pass123',
        'hub@temp.in': 'pass123',
        'accounts@temp.in': 'pass123',
        'client@relianceretail.in': 'client123'
      };

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        fbUser = userCredential.user;
      } catch (fbErr) {
        if (fbErr.code === 'auth/configuration-not-found' || fbErr.code === 'auth/operation-not-allowed') {
          console.warn('Firebase Auth email/password provider is not enabled in Firebase Console. Falling back to local mock authentication.', fbErr);
          if (predefined[lowerEmail] && predefined[lowerEmail] === password) {
            fbUser = { email: lowerEmail };
          } else {
            throw new Error('Incorrect email or password.');
          }
        } else if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
          // If the user doesn't exist yet but has predefined credentials, try to create them
          if (predefined[lowerEmail] && predefined[lowerEmail] === password) {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              fbUser = userCredential.user;
            } catch (createErr) {
              if (createErr.code === 'auth/configuration-not-found' || createErr.code === 'auth/operation-not-allowed') {
                console.warn('Firebase Auth email/password provider is not enabled. Falling back to local mock authentication.', createErr);
                fbUser = { email: lowerEmail };
              } else {
                throw createErr;
              }
            }
          } else {
            throw fbErr;
          }
        } else {
          throw fbErr;
        }
      }

      // 2. Fetch corresponding database profile from Express server
      const res = await api.login(fbUser.email);
      if (res && res.user) {
        onLogin(res.user);
      } else {
        setError('Invalid response from login server.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login Error:', err);
      let errMsg = 'Invalid email or password. Please check your credentials.';
      if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address format.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        errMsg = 'Incorrect email or password.';
      } else if (err.code === 'auth/network-request-failed') {
        errMsg = 'Network error. Please check your connection.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
      setLoading(false);
    }
  };

  const features = [
    { icon: <Truck size={18} />, label: 'FTL & PTL Dispatch', desc: 'Full & part-load tracking' },
    { icon: <Layers size={18} />, label: 'Hub Consolidation', desc: 'Manifest & line-haul ops' },
    { icon: <BarChart3 size={18} />, label: 'Real-time P&L Ledger', desc: 'Trip-level profitability' },
    { icon: <ShieldCheck size={18} />, label: 'GST Compliance', desc: 'e-Invoice & TDS tracking' },
  ];

  return (
    <div className="login-container">

      {/* ── LEFT PANEL — Branding ── */}
      <div className="login-panel-left">
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle, hsla(35,95%,55%,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '280px', height: '280px', background: 'radial-gradient(circle, hsla(210,90%,62%,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Symmetrical Content Wrapper */}
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '56px' }}>
            <div style={{
              width: '46px', height: '46px',
              borderRadius: '13px',
              background: 'linear-gradient(135deg, var(--brand), var(--brand-deep))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px hsla(35,95%,55%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.25)',
            }}>
              <Package size={22} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '700', letterSpacing: '0.07em', color: 'var(--text-primary)' }}>TEMP</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Unified Fleet Operations</div>
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{
              fontSize: '2.6rem',
              fontFamily: 'var(--font-display)',
              fontWeight: '700',
              lineHeight: '1.15',
              letterSpacing: '-0.04em',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--brand-light) 60%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              India's Premium Logistics Command Centre
            </h1>
            <p style={{ fontSize: '0.975rem', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
              End-to-end FTL/PTL operations, hub consolidation, real-time P&L tracking, and GST compliance all in one platform.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="login-features-grid">
            {features.map((f, i) => (
              <div key={i} style={{
                padding: '16px',
                background: 'hsla(224,24%,12%,0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
              }}>
                <div style={{ color: 'var(--brand-light)', flexShrink: 0, marginTop: '1px' }}>{f.icon}</div>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '0.82rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{f.label}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Login Form ── */}
      <div className="login-panel-right">
        {/* Ambient top-right glow */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, hsla(35,95%,55%,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Form Header */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', fontWeight: '700', letterSpacing: '-0.03em', marginBottom: '8px' }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Sign in to access your Temp workspace.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Email */}
            <div>
              <label className="label-premium">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  color: focusedField === 'email' ? 'var(--brand-light)' : 'var(--text-muted)',
                  transition: 'var(--t-fast)',
                }} />
                <input
                  id="login-email"
                  type="email"
                  required
                  className="input-premium"
                  style={{ paddingLeft: '40px', fontSize: '0.9rem' }}
                  placeholder="you@temp.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-premium">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  color: focusedField === 'password' ? 'var(--brand-light)' : 'var(--text-muted)',
                  transition: 'var(--t-fast)',
                }} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  className="input-premium"
                  style={{ paddingLeft: '40px', paddingRight: '44px', fontSize: '0.9rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                  transition: 'var(--t-fast)',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-light)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="alert alert-danger" style={{ padding: '10px 14px', fontSize: '0.82rem' }}>
                <Lock size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                justifyContent: 'center',
                padding: '13px',
                fontSize: '0.95rem',
                marginTop: '4px',
                opacity: loading ? 0.75 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid hsla(0,0%,100%,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.65s linear infinite',
                  }} />
                  Authenticating…
                </>
              ) : (
                <>Sign in to Temp <ChevronRight size={17} /></>
              )}
            </button>
          </form>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '32px' }}>
            Temp v2.0 · © 2026 All rights reserved
          </p>
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
