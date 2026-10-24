"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import Link from "next/link";
import { Turnstile } from "@/components/admin/Turnstile";
import { confirmEnroll, forgotPassword, register, resetPassword, signIn, startEnroll, verifyMfa, type EnrollState, type FormState } from "./actions";

function Alert({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="a-alert err" role="alert">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className="a-alert ok" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function LoginForm({ siteKey, next }: { siteKey: string; next: string }) {
  const [state, action, pending] = useKeptForm(signIn, {});
  return (
    <form onSubmit={action} className="a-card" noValidate>
      <h1>Sign in</h1>
      <p>Studio admin for Midnight Poetry. You&apos;ll confirm with a code from your authenticator app next.</p>
      <Alert state={state} />
      <input type="hidden" name="next" value={next} />
      <div className="a-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className="a-input" />
      </div>
      <div className="a-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="a-input" />
      </div>
      <Turnstile siteKey={siteKey} action="login" resetKey={state.attempt} />
      <button className="a-btn primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="a-help">
        <Link href="/admin/forgot">Forgot password?</Link> · <Link href="/admin/register">Request access</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ siteKey }: { siteKey: string }) {
  const [state, action, pending] = useKeptForm(register, {});
  if (state.ok)
    return (
      <div className="a-card">
        <h1>Almost there</h1>
        <Alert state={state} />
        <Link href="/admin/login" className="a-btn">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form onSubmit={action} className="a-card" noValidate>
      <h1>Request access</h1>
      <p>Create an account to write guides or manage the studio. An owner approves every new account.</p>
      <Alert state={state} />
      <div className="a-field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" required maxLength={80} className="a-input" />
      </div>
      <div className="a-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="a-input" />
      </div>
      <div className="a-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className="a-input" aria-describedby="pw-help" />
        <span id="pw-help" className="a-help">
          At least 12 characters. A long phrase is easiest to remember.
        </span>
      </div>
      <div className="a-field">
        <label htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="a-input" />
      </div>
      <Turnstile siteKey={siteKey} action="register" resetKey={state.attempt} />
      <button className="a-btn primary" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="a-help">
        Already have an account? <Link href="/admin/login">Sign in</Link>
      </p>
    </form>
  );
}

export function ForgotForm({ siteKey }: { siteKey: string }) {
  const [state, action, pending] = useKeptForm(forgotPassword, {});
  return (
    <form onSubmit={action} className="a-card" noValidate>
      <h1>Reset password</h1>
      <p>We&apos;ll email you a link to choose a new password.</p>
      <Alert state={state} />
      <div className="a-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="a-input" />
      </div>
      <Turnstile siteKey={siteKey} action="forgot" resetKey={state.attempt} />
      <button className="a-btn primary" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="a-help">
        <Link href="/admin/login">Back to sign in</Link>
      </p>
    </form>
  );
}

export function MfaForm({ next }: { next: string }) {
  const [state, action, pending] = useKeptForm(verifyMfa, {});
  return (
    <form onSubmit={action} className="a-card">
      <h1>Enter your code</h1>
      <p>Open your authenticator app and enter the 6-digit code for Midnight Poetry.</p>
      <Alert state={state} />
      <input type="hidden" name="next" value={next} />
      <div className="a-field">
        <label htmlFor="code">Code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className="a-input mono" style={{ fontSize: 22, letterSpacing: "0.3em" }} />
      </div>
      <button className="a-btn primary" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}

export function EnrollForm() {
  const [startState, start, starting] = useKeptForm(startEnroll, {} as EnrollState);
  const [state, confirm, confirming] = useKeptForm(confirmEnroll, {} as EnrollState);
  const factor = state.factorId ? state : startState;

  if (!factor.factorId) {
    return (
      <form onSubmit={start} className="a-card">
        <h1>Set up two-step sign-in</h1>
        <p>The studio admin needs a code from an authenticator app (1Password, Google Authenticator, Authy…) every time you sign in.</p>
        <Alert state={startState} />
        <button className="a-btn primary" disabled={starting}>
          {starting ? "Preparing…" : "Show my QR code"}
        </button>
      </form>
    );
  }
  return (
    <form onSubmit={confirm} className="a-card">
      <h1>Scan this code</h1>
      <p>Scan it with your authenticator app, then enter the 6-digit code it shows.</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- QR is an SVG data URI from Supabase */}
      <img className="qr" src={factor.qr} alt="QR code for your authenticator app" width={200} height={200} />
      <details>
        <summary className="a-help">Can&apos;t scan? Enter this key instead</summary>
        <code className="mono" style={{ wordBreak: "break-all", fontSize: 13 }}>
          {factor.secret}
        </code>
      </details>
      <Alert state={state} />
      <input type="hidden" name="factorId" value={factor.factorId} />
      <div className="a-field">
        <label htmlFor="code">Code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required className="a-input mono" style={{ fontSize: 22, letterSpacing: "0.3em" }} />
      </div>
      <button className="a-btn primary" disabled={confirming}>
        {confirming ? "Checking…" : "Turn on two-step sign-in"}
      </button>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useKeptForm(resetPassword, {});
  return (
    <form onSubmit={action} className="a-card" noValidate>
      <h1>Choose a new password</h1>
      <Alert state={state} />
      {state.ok ? (
        <Link href="/admin" className="a-btn primary">
          Go to the admin
        </Link>
      ) : (
        <>
          <div className="a-field">
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className="a-input" />
          </div>
          <div className="a-field">
            <label htmlFor="confirm">Confirm new password</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="a-input" />
          </div>
          <button className="a-btn primary" disabled={pending}>
            {pending ? "Saving…" : "Save password"}
          </button>
        </>
      )}
    </form>
  );
}
