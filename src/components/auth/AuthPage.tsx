import React, { useState } from 'react';
import {
  HeartPulse,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Radio,
  Eye,
  EyeOff,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { supabase, formatAuthError, upsertProfile } from '../../lib/supabase';

interface AuthPageProps {
  initialMode?: 'login' | 'signup' | 'forgot' | 'reset';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onSuccess,
  onCancel,
}) => {
  const { isConfigured } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>(initialMode);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('family');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  // Simple email validator
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleResendVerification = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address to resend verification.');
      return;
    }
    setResendLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      setResendLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Verification email resent! Please check your inbox.');
      }
    } catch (err: any) {
      setResendLoading(false);
      setErrorMessage(err.message || 'Failed to resend verification email.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validation for Sign Up
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setLoading(true);

      console.log("SIGNUP_STARTED", { email: email.trim() });

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || ''
          },
          emailRedirectTo: window.location.origin
        }
      });

      console.log("SIGNUP_RESULT", {
        userId: data?.user?.id ?? null,
        email: data?.user?.email ?? null,
        error: error?.message ?? null
      });

      setLoading(false);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data?.user) {
        setErrorMessage('No user was returned from Supabase. Please try again.');
        return;
      }

      // Check if user already exists (identities array empty in Supabase)
      if (data.user.identities && data.user.identities.length === 0) {
        setErrorMessage('This email is already registered. Please sign in instead.');
        return;
      }

      if (!data.session) {
        // Email confirmation is required by Supabase Auth
        setSuccessMessage("Account created. Please check your email and verify your account before signing in.");
        setShowResend(true);
      } else {
        // Immediate session: authenticated user
        try {
          await upsertProfile({
            id: data.user.id,
            user_id: data.user.id,
            full_name: fullName.trim(),
            phone: phone.trim() || undefined,
            role: role || 'caregiver',
          });
        } catch (profileErr) {
          console.warn('Profile creation note:', profileErr);
        }
        setSuccessMessage("Account created successfully! Welcome to ElderCare AI.");
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 1000);
      }
      return;
    }

    // 2. Validation for Sign In
    if (mode === 'login') {
      if (!isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }

      setLoading(true);

      console.log("LOGIN_STARTED", { email: email.trim() });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      console.log("LOGIN_RESULT", {
        userId: data?.user?.id ?? null,
        email: data?.user?.email ?? null,
        error: error?.message ?? null
      });

      setLoading(false);

      if (error) {
        setErrorMessage(error.message);
        if (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('not verified')) {
          setShowResend(true);
        }
        return;
      }

      if (data?.user) {
        setSuccessMessage('Logged in successfully! Connecting your dashboard...');
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 400);
      }
      return;
    }

    // 3. Validation for Forgot Password
    if (mode === 'forgot') {
      if (!isValidEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }

      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      setLoading(false);

      if (error) {
        setErrorMessage(formatAuthError(error));
      } else {
        setSuccessMessage("If an account exists for this email, you'll receive a password reset link shortly.");
      }
      return;
    }

    // 4. Validation for Reset Password
    if (mode === 'reset') {
      if (!password || password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);

      if (error) {
        setErrorMessage(formatAuthError(error));
      } else {
        setSuccessMessage('Password successfully updated. You can now sign in.');
        setTimeout(() => setMode('login'), 2000);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#FBFBFA] font-sans">
      {/* Desktop Left Side: Branding & Companion Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/30">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight">
                ElderCare<span className="text-teal-400"> AI</span>
              </span>
              <p className="text-xs text-teal-200/80 font-medium">Care that calls. Care that listens.</p>
            </div>
          </div>
        </div>

        {/* Center Visual: AI Companion & Acoustic Waveform */}
        <div className="relative z-10 my-auto py-8 space-y-8 max-w-md">
          <div className="relative mx-auto w-48 h-48 flex items-center justify-center">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full border border-teal-500/30 animate-ping opacity-25" />
            <div className="absolute -inset-4 rounded-full border border-emerald-400/20 animate-pulse" />
            <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-teal-600/40 to-emerald-500/30 backdrop-blur-md border border-teal-400/40 flex flex-col items-center justify-center text-center p-4 shadow-2xl">
              <Radio className="w-8 h-8 text-teal-300 animate-pulse mb-1.5" />
              <span className="text-xs font-bold text-teal-100">AI Care Voice</span>
              <span className="text-[10px] text-teal-300/80">Active Listening</span>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
              What if checking on your parents was{' '}
              <span className="text-teal-300">just a phone call away?</span>
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Connect loving families with aging parents. ElderCare AI conducts gentle, proactive check-ins in Hindi, Hinglish, and English — tracking vitals and medicines without app anxiety.
            </p>
          </div>

          {/* Value props list */}
          <div className="space-y-2.5 pt-2 text-xs text-slate-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Proactive automated voice calls with Gemini 2.5 Live</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Real-time vitals extraction & caregiver alerts</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Dedicated Elderly Mode for senior-friendly peace of mind</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Supabase Auth & Row Level Security (RLS) data protection</span>
            </div>
          </div>
        </div>

        {/* Security & RLS Footer Badge */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Encrypted with Supabase Row Level Security</span>
          </div>
          <span>HIPAA & Healthcare Compliant Design</span>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-10 overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-extrabold text-slate-900">
                  ElderCare<span className="text-teal-600"> AI</span>
                </span>
                <p className="text-[10px] text-slate-500 font-medium">Care that calls. Care that listens.</p>
              </div>
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            )}
          </div>

          {/* Top Cancel / Back to Home link */}
          {onCancel && (
            <div className="hidden lg:block">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </button>
            </div>
          )}

          {/* Form Header */}
          <div className="space-y-1.5">
            {mode === 'signup' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Create your ElderCare account
                </h1>
                <p className="text-sm text-slate-600">
                  Stay connected with the people you care about.
                </p>
              </>
            )}

            {mode === 'login' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Welcome back
                </h1>
                <p className="text-sm text-slate-600">
                  Sign in to access your family care hub.
                </p>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Forgot your password?
                </h1>
                <p className="text-sm text-slate-600">
                  Enter your email address and we'll send you a password reset link.
                </p>
              </>
            )}

            {mode === 'reset' && (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Set new password
                </h1>
                <p className="text-sm text-slate-600">
                  Choose a new, secure password for your account.
                </p>
              </>
            )}
          </div>

          {/* Unconfigured Supabase Notice */}
          {!isConfigured && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-700" />
                <span>Supabase Configuration Notice</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Supabase credentials (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_URL</code>) are not yet configured. You can test the complete product experience using the <span className="font-bold">Try Demo</span> button below.
              </p>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
              </div>
              {showResend && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="mt-1 self-start px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resendLoading ? 'Resending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          {/* Success Message Box */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
              </div>
              {showResend && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="mt-1 self-start px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {resendLoading ? 'Resending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SIGNUP: Full Name */}
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-full-name">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* Email (Shown in signup, login, forgot) */}
            {mode !== 'reset' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* SIGNUP: Phone Number (Optional) */}
            {mode === 'signup' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-phone">
                    Phone Number
                  </label>
                  <span className="text-[10px] text-slate-400">Optional</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* SIGNUP: Role Selection */}
            {mode === 'signup' && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  I am creating this account as:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRole('family')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      role === 'family'
                        ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Users className="w-4 h-4 text-teal-600" />
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${role === 'family' ? 'border-teal-600 bg-teal-600' : 'border-slate-300'}`}>
                        {role === 'family' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <span className="text-xs font-bold block">Family / Caregiver</span>
                    <span className="text-[10px] text-slate-500 leading-tight">I care for an aging relative</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('elderly')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      role === 'elderly'
                        ? 'border-teal-600 bg-teal-50/70 text-teal-900 ring-2 ring-teal-600/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <HeartPulse className="w-4 h-4 text-teal-600" />
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${role === 'elderly' ? 'border-teal-600 bg-teal-600' : 'border-slate-300'}`}>
                        {role === 'elderly' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <span className="text-xs font-bold block">Elderly User</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Large-text, voice-first UI</span>
                  </button>
                </div>
              </div>
            )}

            {/* Password (login, signup, reset) */}
            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-password">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (signup, reset) */}
            {(mode === 'signup' || mode === 'reset') && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="auth-confirm-password">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              id="auth-submit-btn"
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'login' && 'Sign In'}
                    {mode === 'forgot' && 'Send Reset Link'}
                    {mode === 'reset' && 'Update Password'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Signup */}
          <div className="text-center pt-2">
            {mode === 'signup' && (
              <p className="text-xs text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-teal-600 hover:text-teal-700 cursor-pointer hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}

            {mode === 'login' && (
              <p className="text-xs text-slate-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-teal-600 hover:text-teal-700 cursor-pointer hover:underline"
                >
                  Create an account
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p className="text-xs text-slate-600">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="font-bold text-teal-600 hover:text-teal-700 cursor-pointer hover:underline"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
