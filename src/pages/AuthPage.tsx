import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { Spinner } from '../components/Spinner';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  
  // State to toggle the card view dynamically after registration or an unverified login attempt
  const [showEmailVerificationCheck, setShowEmailVerificationCheck] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Password is required.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    
    setSubmitting(true);
    setErrors((p) => ({ ...p, form: undefined }));
    
    const fn = mode === 'signin' ? signIn : signUp;
    
    try {
      const response = await fn(email.trim(), password);
      setSubmitting(false);

      // Cast response safely as 'any' to fix the TypeScript property lookup error
      const resData = response as any;
      const rawError = resData?.error?.message || resData?.error;
      
      if (response && rawError) {
        const errorMsg = String(rawError);

        // If the error states they need to confirm their email, force-open the confirmation card view
        if (errorMsg.toLowerCase().includes('confirm your email') || errorMsg.toLowerCase().includes('confirm your account')) {
          toast.info('Verification Required', 'Please confirm your email address.');
          setShowEmailVerificationCheck(true);
          return;
        }

        setErrors({ form: errorMsg });
        toast.error(mode === 'signin' ? 'Sign-in failed' : 'Sign-up failed', errorMsg);
        return;
      }

      // Action routing on success
      if (mode === 'signup') {
        toast.success('Account created', 'Verification link sent to your inbox.');
        setShowEmailVerificationCheck(true); 
      } else {
        toast.success('Signed in', 'Loading your projects…');
      }
    } catch (err: any) {
      setSubmitting(false);
      const catchMessage = err?.message || '';

      // Fallback check if your auth hook throws the string via catch blocks
      if (catchMessage.toLowerCase().includes('confirm your email') || catchMessage.toLowerCase().includes('confirm your account')) {
        toast.info('Verification Required', 'Please confirm your email address.');
        setShowEmailVerificationCheck(true);
        return;
      }

      setErrors({ form: catchMessage || 'Server connection timed out.' });
      toast.error(mode === 'signin' ? 'Sign-in failed' : 'Sign-up failed', catchMessage || 'Server connection timed out.');
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-ink-50/40">
      <BrandPanel />
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex justify-center">
            <BrandMark />
          </div>

          {/* Structured UI Card Wrap Wrapper */}
          <div className="bg-white border border-ink-100 rounded-2xl p-6 sm:p-8 shadow-xl shadow-ink-950/[0.02] relative overflow-hidden transition-all duration-300">
            
            {showEmailVerificationCheck ? (
              /* DYNAMIC CARD VIEW: Rendered following unverified login or new registration */
              <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="h-14 w-14 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mb-4 text-brand-600 shadow-inner">
                  <Mail className="h-6 w-6" />
                </div>
                <h1 className="font-display text-2xl font-bold text-ink-900 mb-2">
                  Confirm your email
                </h1>
                <p className="text-sm text-ink-500 max-w-sm mb-6 leading-relaxed">
                  We have sent a confirmation link to <strong className="text-ink-900 font-semibold">{email || 'your email'}</strong>. Please check your inbox to activate your secure ledger.
                </p>
                <button
                  type="button"
                  className="btn-primary w-full py-3 justify-center"
                  onClick={() => {
                    setShowEmailVerificationCheck(false);
                    setMode('signin');
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              /* STANDARD CARD VIEW: Traditional application portal forms */
              <>
                <h1 className="font-display text-2xl font-bold text-ink-900">
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="mt-1.5 text-sm text-ink-500">
                  {mode === 'signin'
                    ? 'Sign in to access your production ledgers.'
                    : 'Start tracking your production finances in minutes.'}
                </p>

                <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
                  <div>
                    <label className="label" htmlFor="email">
                      <span>Email</span>
                      <span className="text-danger-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                        placeholder="you@studio.in"
                      />
                    </div>
                    {errors.email && <p className="mt-1.5 text-xs font-medium text-danger-600">{errors.email}</p>}
                  </div>

                  <div>
                    <label className="label" htmlFor="password">
                      <span>Password</span>
                      <span className="text-danger-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                        placeholder="At least 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="mt-1.5 text-xs font-medium text-danger-600">{errors.password}</p>}
                  </div>

                  {errors.form && (
                    <div className="animate-fade-in rounded-xl border border-danger-200 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
                      {errors.form}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="btn-primary w-full py-3 justify-center">
                    {submitting ? (
                      <>
                        <Spinner /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                      </>
                    ) : (
                      <>
                        {mode === 'signin' ? 'Sign in' : 'Create account'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-ink-500">
                  {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                      setErrors({});
                    }}
                    className="font-semibold text-brand-700 hover:text-brand-800"
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>

                <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Your data is encrypted and isolated to your account.
                </p>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-950 to-brand-950" />
      <div className="absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
      <div className="absolute -left-24 bottom-1/4 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" aria-hidden />

      <div className="relative z-10">
        <BrandMark light />
      </div>

      <div className="relative z-10 max-w-md">
        <h2 className="font-display text-3xl font-bold leading-tight text-white text-balance">
          The ledger built for the chaos of production cash flows.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-ink-300">
          Track fragmented inflows, talent installments, and physical expenses across every project —
          with live balances, burn-rate analytics, and absolute data isolation. All in Indian Rupee.
        </p>

        <div className="mt-8 space-y-3">
          <FeatureRow icon={<TrendingUp className="h-4 w-4" />} title="Live capital summary" desc="Inflow, outflow, and remaining balance update instantly." />
          <FeatureRow icon={<Users className="h-4 w-4" />} title="Installment sub-ledgers" desc="Track milestone payments per talent or crew member." />
          <FeatureRow icon={<ShieldCheck className="h-4 w-4" />} title="Multi-tenant isolation" desc="Your projects, your data — never anyone else's." />
        </div>
      </div>

      <div className="relative z-10 text-xs text-ink-400">
        © {new Date().getFullYear()} CapCount. Built for production houses & event managers.
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-ink-400">{desc}</p>
      </div>
    </div>
  );
}

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
        <img src="/logo.png" alt="CapCount logo" className="h-6 w-6 object-contain" />
      </div>
      <div>
        <p className={`font-display text-lg font-bold ${light ? 'text-white' : 'text-ink-900'}`}>CapCount</p>
        <p className={`text-xs ${light ? 'text-ink-400' : 'text-ink-500'}`}>Production Ledger</p>
      </div>
    </div>
  );
}