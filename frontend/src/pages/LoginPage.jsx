import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import toast from 'react-hot-toast';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Shield, Cpu, Zap, Mic, Brain } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import MemoryManagementLogo from '../components/MemoryManagementLogo';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, isAuthenticated } = useAuthStore();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    preferredLanguage: 'hinglish',
  });

  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '780172743867-f28nep20u109mqeqdlu45sh3dkcrken9.apps.googleusercontent.com';
  const googleBtnContainerRef = useRef(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Load Google Identity Services (GIS) if client ID is configured
  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            try {
              setLoading(true);
              setErrorMessage('');
              await loginWithGoogle(response.credential);
              toast.success('Signed in with Google!');
              navigate('/');
            } catch (err) {
              const msg = err.response?.data?.message || err.message || 'Google Sign-In failed.';
              setErrorMessage(msg);
              toast.error(msg);
            } finally {
              setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleBtnContainerRef.current) {
          try {
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: isDark ? 'filled_black' : 'outline',
              size: 'large',
              width: 380,
              text: 'continue_with',
            });
          } catch (renderErr) {
            // Silently fallback to prompt() on click
          }
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleClientId, loginWithGoogle, navigate, isDark]);

  const handleGoogleClick = () => {
    if (!googleClientId) {
      setErrorMessage(
        'Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to frontend/.env and GOOGLE_CLIENT_ID to backend/.env.'
      );
      toast.error('Google OAuth is not configured');
      return;
    }

    if (window.google?.accounts?.id) {
      const renderedBtn = googleBtnContainerRef.current?.querySelector('div[role=button]');
      if (renderedBtn) {
        renderedBtn.click();
      } else {
        window.google.accounts.id.prompt();
      }
    } else {
      toast.error('Google Sign-In is still loading. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    toast('Password reset feature: Please contact support or your system administrator.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    if (isRegister) {
      if (!form.name.trim()) {
        setErrorMessage('Full name is required');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters');
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setErrorMessage('Password must contain at least one uppercase letter');
        return;
      }
      if (!/[0-9]/.test(password)) {
        setErrorMessage('Password must contain at least one number');
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(form.name.trim(), email, password, form.preferredLanguage);
        toast.success('Account created successfully! 🎉');
      } else {
        await login(email, password);
        toast.success('Logged in successfully!');
      }
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        (isRegister ? 'Registration failed. Please try again.' : 'Invalid email or password.');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col lg:flex-row overflow-hidden relative"
      style={{
        background: isDark ? 'var(--bg-primary)' : '#FFFFFF',
      }}
    >
      <style>{`
        @keyframes radar-pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.9; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes orbit-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-ccw {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes ping-slow {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        .radar-pulse-anim {
          animation: radar-pulse 4s ease-in-out infinite;
        }
        .orbit-cw-anim {
          animation: orbit-cw 22s linear infinite;
        }
        .orbit-ccw-anim {
          animation: orbit-ccw 32s linear infinite;
        }
        .ping-slow-anim {
          animation: ping-slow 3s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        }
      `}</style>

      {/* Top right floating theme switcher */}
      <div className="absolute top-4 right-4 z-30">
        <ThemeToggle variant="segmented" />
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* LEFT PANEL: High-Tech Orbital Radar & Memory Core Showcase   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div
        className="w-full lg:w-[48%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-hidden select-none border-b lg:border-b-0 lg:border-r transition-colors duration-200"
        style={{
          background: isDark
            ? 'linear-gradient(145deg, #060b18 0%, #0a1329 50%, #080f21 100%)'
            : '#F7F7F8',
          borderColor: isDark ? '#2e3035' : '#E5E7EB',
          color: isDark ? '#FFFFFF' : '#202123',
        }}
      >
        {/* Subtle ambient background glow */}
        <div
          className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] pointer-events-none ${
            isDark ? 'bg-cyan-500/10' : 'bg-blue-500/5'
          }`}
        />
        <div
          className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none ${
            isDark ? 'bg-purple-600/15' : 'bg-amber-500/5'
          }`}
        />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <MemoryManagementLogo
            size={42}
            showText
            textClassName={isDark ? 'text-white' : 'text-[#202123]'}
          />

          <div
            className={`text-[11px] font-mono tracking-widest uppercase hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border ${
              isDark
                ? 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isDark ? 'bg-cyan-400' : 'bg-emerald-500'
              }`}
            />
            SYS // ONLINE
          </div>
        </div>

        {/* Central Animated Radar / Orbital Core with Memory Chip Center */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-8 py-6">
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center">
            {/* Outermost dotted orbit */}
            <div
              className={`absolute inset-0 rounded-full border border-dashed orbit-cw-anim ${
                isDark ? 'border-cyan-500/20' : 'border-[#2563EB]/25'
              }`}
              style={{ borderSpacing: '6px' }}
            >
              {/* Orbital Satellite 1 */}
              <div
                className={`absolute top-4 left-1/4 w-2 h-2 rounded-full ${
                  isDark
                    ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                    : 'bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.6)]'
                }`}
              />
            </div>

            {/* Middle Thin Solid Orbit */}
            <div
              className={`absolute inset-8 sm:inset-10 rounded-full border orbit-ccw-anim ${
                isDark ? 'border-cyan-500/30' : 'border-[#CBD5E1]'
              }`}
            >
              {/* Orbital Satellite 2 */}
              <div
                className={`absolute bottom-6 right-10 w-2.5 h-2.5 rounded-full ${
                  isDark
                    ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                    : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                }`}
              />
              {/* Coordinate notch */}
              <div
                className={`absolute top-1/2 -left-1 w-2 h-0.5 ${
                  isDark ? 'bg-cyan-400/80' : 'bg-[#2563EB]'
                }`}
              />
              <div
                className={`absolute top-1/2 -right-1 w-2 h-0.5 ${
                  isDark ? 'bg-cyan-400/80' : 'bg-[#2563EB]'
                }`}
              />
            </div>

            {/* Inner Ring (Pulsing) */}
            <div
              className={`absolute inset-20 sm:inset-24 rounded-full border radar-pulse-anim ${
                isDark ? 'border-cyan-400/40' : 'border-[#2563EB]/30'
              }`}
            >
              <div
                className={`absolute top-3 right-6 w-1.5 h-1.5 rounded-full ${
                  isDark
                    ? 'bg-cyan-300 shadow-[0_0_6px_#67e8f9]'
                    : 'bg-[#2563EB] shadow-[0_0_6px_rgba(37,99,235,0.5)]'
                }`}
              />
            </div>

            {/* Central Memory Chip Core */}
            <div className="relative flex items-center justify-center">
              {/* Expanding acoustic wave ping */}
              <div
                className={`absolute w-20 h-20 rounded-full ping-slow-anim ${
                  isDark ? 'bg-cyan-400/25' : 'bg-blue-400/20'
                }`}
              />

              {/* Glowing Aura */}
              <div
                className={`absolute w-20 h-20 rounded-full blur-lg opacity-70 ${
                  isDark
                    ? 'bg-linear-to-tr from-cyan-500 to-amber-500'
                    : 'bg-linear-to-tr from-blue-400 to-amber-300'
                }`}
              />

              {/* Memory Chip */}
              <div
                className={`relative z-10 ${
                  isDark
                    ? 'drop-shadow-[0_0_20px_rgba(28,93,153,0.8)]'
                    : 'drop-shadow-[0_4px_12px_rgba(37,99,235,0.2)]'
                }`}
              >
                <MemoryManagementLogo size={68} />
              </div>
            </div>

            {/* Decorative crosshairs / axis lines */}
            <div
              className={`absolute w-full h-px pointer-events-none ${
                isDark
                  ? 'bg-linear-to-r from-transparent via-cyan-500/20 to-transparent'
                  : 'bg-linear-to-r from-transparent via-blue-500/15 to-transparent'
              }`}
            />
            <div
              className={`absolute h-full w-px pointer-events-none ${
                isDark
                  ? 'bg-linear-to-b from-transparent via-cyan-500/20 to-transparent'
                  : 'bg-linear-to-b from-transparent via-blue-500/15 to-transparent'
              }`}
            />
          </div>
        </div>

        {/* Bottom Hero Copy */}
        <div className="relative z-10 flex flex-col gap-3">
          <h2
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-[#202123]'
            }`}
          >
            One assistant that <br />
            <span
              className={
                isDark
                  ? 'text-transparent bg-clip-text bg-linear-to-r from-cyan-300 via-sky-300 to-amber-300'
                  : 'text-[#2563EB]'
              }
            >
              remembers your day.
            </span>
          </h2>
          <p
            className={`text-sm sm:text-base max-w-md leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-[#6B7280]'
            }`}
          >
            Talk to it, give it tasks, and pick up where you left off.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-medium">
            <span
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-300'
                  : 'bg-white border-[#E5E7EB] text-[#202123] shadow-xs'
              }`}
            >
              <Mic size={13} className="text-[#2563EB]" /> Voice & Continuous Audio
            </span>
            <span
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-300'
                  : 'bg-white border-[#E5E7EB] text-[#202123] shadow-xs'
              }`}
            >
              <Brain size={13} className="text-[#2563EB]" /> Connected Memory
            </span>
            <span
              className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-300'
                  : 'bg-white border-[#E5E7EB] text-[#202123] shadow-xs'
              }`}
            >
              <Zap size={13} className="text-amber-500" /> Autonomous Browser
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* RIGHT PANEL: Clean Modern ChatGPT Light Auth Form            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div
        className="w-full lg:w-[52%] flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative overflow-y-auto"
        style={{
          background: isDark ? 'var(--bg-primary)' : '#FFFFFF',
          color: isDark ? '#FFFFFF' : '#202123',
        }}
      >
        <div className="w-full max-w-md mx-auto my-auto flex flex-col gap-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="lg:hidden mb-2">
              <MemoryManagementLogo
                size={36}
                showText
                textClassName={isDark ? 'text-white' : 'text-[#202123]'}
              />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: isDark ? '#FFFFFF' : '#202123' }}
            >
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h1>
            <p className="text-sm" style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {isRegister
                ? 'Sign up to start with Memory Management.'
                : 'Sign in to continue with Memory Management.'}
            </p>
          </div>

          {/* Continue with Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 border cursor-pointer shadow-xs ${
              isDark
                ? 'bg-[#1e1f22] border-[#2e3035] text-white hover:bg-[#2b2d31]'
                : 'bg-white border-[#E5E7EB] text-[#202123] hover:bg-[#F7F7F8]'
            }`}
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Hidden container for GIS button rendering */}
          <div ref={googleBtnContainerRef} style={{ display: 'none' }} aria-hidden="true" />

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div
              className="flex-1 h-px"
              style={{ background: isDark ? '#2e3035' : '#E5E7EB' }}
            />
            <span
              className="text-xs uppercase tracking-wider font-medium"
              style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}
            >
              or use your email
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: isDark ? '#2e3035' : '#E5E7EB' }}
            />
          </div>

          {/* Tabs: Log in / Create account */}
          <div
            className="flex border-b"
            style={{ borderColor: isDark ? '#2e3035' : '#E5E7EB' }}
          >
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMessage('');
              }}
              className={`pb-2.5 text-sm font-semibold transition-all relative mr-6 cursor-pointer ${
                !isRegister ? 'font-bold' : 'hover:opacity-80'
              }`}
              style={{
                color: !isRegister
                  ? isDark
                    ? '#FFFFFF'
                    : '#202123'
                  : isDark
                  ? '#6B7280'
                  : '#9CA3AF',
              }}
            >
              Log in
              {!isRegister && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: '#2563EB' }}
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMessage('');
              }}
              className={`pb-2.5 text-sm font-semibold transition-all relative cursor-pointer ${
                isRegister ? 'font-bold' : 'hover:opacity-80'
              }`}
              style={{
                color: isRegister
                  ? isDark
                    ? '#FFFFFF'
                    : '#202123'
                  : isDark
                  ? '#6B7280'
                  : '#9CA3AF',
              }}
            >
              Create account
              {isRegister && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: '#2563EB' }}
                />
              )}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold"
                  style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
                >
                  Full Name
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}
                  />
                  <input
                    type="text"
                    className="w-full py-2.5 pl-10 pr-3 rounded-xl border text-sm transition-all outline-none"
                    style={{
                      background: isDark ? '#1e1f22' : '#FFFFFF',
                      borderColor: isDark ? '#2e3035' : '#E5E7EB',
                      color: isDark ? '#FFFFFF' : '#202123',
                    }}
                    placeholder="e.g. Brijesh Mishra"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold"
                style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}
                />
                <input
                  type="email"
                  className="w-full py-2.5 pl-10 pr-3 rounded-xl border text-sm transition-all outline-none"
                  style={{
                    background: isDark ? '#1e1f22' : '#FFFFFF',
                    borderColor: isDark ? '#2e3035' : '#E5E7EB',
                    color: isDark ? '#FFFFFF' : '#202123',
                  }}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-xs font-semibold"
                  style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
                >
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs hover:underline cursor-pointer text-[#2563EB]"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full py-2.5 pl-10 pr-16 rounded-xl border text-sm transition-all outline-none"
                  style={{
                    background: isDark ? '#1e1f22' : '#FFFFFF',
                    borderColor: isDark ? '#2e3035' : '#E5E7EB',
                    color: isDark ? '#FFFFFF' : '#202123',
                  }}
                  placeholder={
                    isRegister
                      ? 'At least 8 characters (1 uppercase, 1 digit)'
                      : 'Enter your password'
                  }
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold hover:opacity-80 cursor-pointer"
                  style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold"
                  style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}
                >
                  Preferred Language
                </label>
                <select
                  className="w-full py-2.5 px-3 rounded-xl border text-sm transition-all outline-none"
                  style={{
                    background: isDark ? '#1e1f22' : '#FFFFFF',
                    borderColor: isDark ? '#2e3035' : '#E5E7EB',
                    color: isDark ? '#FFFFFF' : '#202123',
                  }}
                  value={form.preferredLanguage}
                  onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                >
                  <option value="hinglish">Hinglish (हिंदी + English)</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिंदी)</option>
                </select>
              </div>
            )}

            {/* Primary Submit Button: Clean Blue */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 shadow-xs text-white bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create account' : 'Sign In'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info note */}
        <div
          className="w-full max-w-md mx-auto pt-6 text-center text-xs"
          style={{ color: isDark ? '#6B7280' : '#9CA3AF' }}
        >
          Voice, memory and tasks, all in one place.
        </div>
      </div>
    </div>
  );
}