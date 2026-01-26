'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Agency Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Sign in with your email to continue.
      </p>

      {status === 'sent' ? (
        <div style={{ padding: '1rem', background: '#f0f9f0', borderRadius: 8 }}>
          <p>Check your email for a magic link to sign in.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              border: '1px solid #ccc',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: status === 'loading' ? 'wait' : 'pointer',
            }}
          >
            {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
          </button>
          {status === 'error' && (
            <p style={{ color: 'red', marginTop: '0.5rem' }}>{errorMessage}</p>
          )}
        </form>
      )}
    </div>
  );
}
