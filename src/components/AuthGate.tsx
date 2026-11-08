import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AUTH_CHANGED_EVENT, AUTHENTICATED_STORAGE_KEY, clearPrivateData } from '../helpers/api';
import { cn, contentPanelClass, fieldClass, pageTitleClass, pillButtonClass } from '../helpers/uiClasses';

function rememberLogin() {
  try { localStorage.setItem(AUTHENTICATED_STORAGE_KEY, 'true'); } catch { /* Optional offline cache. */ }
}

function hasRememberedLogin() {
  try { return localStorage.getItem(AUTHENTICATED_STORAGE_KEY) === 'true'; } catch { return false; }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'anonymous' | 'authenticated'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    let active = true;
    let clearing = false;
    async function expire() {
      if (clearing) return;
      clearing = true;
      setStatus('checking');
      await clearPrivateData();
      if (active) { setPassword(''); setStatus('anonymous'); }
      clearing = false;
    }
    async function checkSession() {
      try {
        const response = await fetch('/api/session', { cache: 'no-store' });
        if (!active) return;
        if (response.ok) { rememberLogin(); setStatus('authenticated'); }
        else if (response.status === 401) await expire();
        else { setError('Could not check your login. Please try again.'); setStatus('anonymous'); }
      } catch {
        if (!active) return;
        if (hasRememberedLogin()) { setStatus('authenticated'); setOffline(true); }
        else { setError('Connect to the internet to sign in.'); setStatus('anonymous'); }
      }
    }
    function onStorage(event: StorageEvent) {
      if (event.key === AUTHENTICATED_STORAGE_KEY && event.newValue === null) void expire();
    }
    function onOffline() { setOffline(true); }
    function onOnline() { setOffline(false); void checkSession(); }
    const onExpired = () => { void expire(); };
    window.addEventListener(AUTH_CHANGED_EVENT, onExpired);
    window.addEventListener('storage', onStorage);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    void checkSession();
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, onExpired);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) { setError(body.error ?? 'Could not sign in.'); return; }
      rememberLogin();
      setPassword('');
      setStatus('authenticated');
    } catch { setError('Could not connect. Please try again.'); }
    finally { setPending(false); }
  }

  if (status === 'authenticated') {
    return <>
      {offline && <p role="status" className="m-0 bg-app-brand-strong px-4 py-2 text-center text-sm text-app-on-accent">
        Offline — viewing saved data. Reconnect to save changes.
      </p>}
      {children}
    </>;
  }
  return (
    <main className="grid min-h-[100dvh] place-items-center p-5">
      <section className={cn(contentPanelClass, 'w-full max-w-md')}>
        <h1 className={pageTitleClass}>Recipes</h1>
        {status === 'checking' ? <p role="status">Checking your login…</p> : (
          <form onSubmit={login} className="mt-6 grid gap-4">
            <p className="m-0 text-app-muted">Your recipes, all in one place.</p>
            <input type="hidden" name="username" autoComplete="username" value="recipes" />
            <label className="grid gap-2 font-semibold">
              Password
              <input type="password" name="password" autoComplete="current-password"
                className={fieldClass} value={password} required maxLength={256}
                onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p role="alert" className="m-0 text-app-danger">{error}</p>}
            <button className={pillButtonClass} type="submit" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
