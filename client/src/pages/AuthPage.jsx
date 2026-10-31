import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandMark } from '../components/Icons.jsx';

export default function AuthPage({ mode }) {
  const { user, login, register } = useAuth();
  const location = useLocation();
  const from = location.state?.from || '/';
  const isLogin = mode === 'login';

  const [form, setForm] = useState({ displayName: '', username: '', email: '', identifier: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isLogin) await login(form.identifier, form.password);
      else
        await register({
          displayName: form.displayName,
          username: form.username,
          email: form.email,
          password: form.password,
        });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-intro">
        <Link to="/explore" className="brand">
          <BrandMark size={34} />
          <span className="brand-word">murmur</span>
        </Link>
        <h1>Small posts, big conversations.</h1>
        <p>
          Follow people, post updates with a photo, and reply in threads that stay easy to read.
        </p>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <h2>{isLogin ? 'Log in' : 'Create your account'}</h2>

        {isLogin ? (
          <label className="field">
            <span className="field-label">Username or email</span>
            <input value={form.identifier} onChange={set('identifier')} autoComplete="username" required autoFocus />
          </label>
        ) : (
          <>
            <label className="field">
              <span className="field-label">Name</span>
              <input value={form.displayName} onChange={set('displayName')} maxLength={40} autoComplete="name" />
            </label>
            <label className="field">
              <span className="field-label">Username</span>
              <input
                value={form.username}
                onChange={set('username')}
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                title="Letters, numbers and underscores"
                autoComplete="username"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            </label>
          </>
        )}

        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            minLength={isLogin ? undefined : 6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
          {!isLogin ? <span className="field-hint">At least 6 characters</span> : null}
        </label>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn-solid btn-block" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>

        <p className="auth-switch">
          {isLogin ? (
            <>
              New here? <Link to="/register" state={{ from }}>Create an account</Link>
            </>
          ) : (
            <>
              Already have an account? <Link to="/login" state={{ from }}>Log in</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
