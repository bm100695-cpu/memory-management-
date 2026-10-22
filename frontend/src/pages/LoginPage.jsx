import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Brain, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, isAuthenticated } = useAuthStore();
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

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleBtnContainerRef = React.useRef(null);

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
              const msg =
                err.response?.data?.message || err.message || 'Google Sign-In failed.';
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
              theme: 'outline',
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
  }, [googleClientId, loginWithGoogle, navigate]);

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
      return;
    }

    toast.error('Google Identity Services is still loading. Please try again.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Frontend validations
    const email = form.email.trim();
    const password = form.password;

    if (!email) {
      setErrorMessage('Email is required');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    if (isRegister) {
      if (!form.name.trim()) {
        setErrorMessage('Full name is required for registration');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long');
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
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Top right theme switcher (White / Night) */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle variant="segmented" />
      </div>

      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'var(--accent-primary)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
          style={{ background: '#60a5fa' }}
        />
      </div>

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 animate-pulse-glow"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            }}
          >
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">JARVIS</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your Personal AI Agent
          </p>
        </div>

        {/* Auth Card */}
        <div className="card">
          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className={`w-full mb-3 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-3 transition-all duration-200 border shadow-sm ${
              !googleClientId
                ? 'opacity-70 cursor-not-allowed'
                : 'cursor-pointer hover:opacity-90'
            }`}
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            title={!googleClientId ? 'Google OAuth is not configured in .env' : 'Sign in with Google'}
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

          {/* Missing Google OAuth Setup Notice */}
          {!googleClientId && (
            <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Google Sign-In is not configured (missing <code>VITE_GOOGLE_CLIENT_ID</code>)</span>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
            <span className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
              Or with email & password
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
          </div>

          {/* Login / Register Tab Switcher */}
          <div
            className="flex rounded-xl overflow-hidden mb-6 p-1 border"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {['Login', 'Register'].map((tab) => {
              const active = (isRegister ? 'Register' : 'Login') === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setIsRegister(tab === 'Register');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    active ? 'shadow-sm' : 'hover:opacity-80'
                  }`}
                  style={
                    active
                      ? {
                          background:
                            'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                          color: '#ffffff',
                        }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login / Register Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isRegister && (
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    className="input pl-9"
                    placeholder="Your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder={
                    isRegister ? 'Min 8 chars, 1 uppercase, 1 number' : 'Your password'
                  }
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="input-group">
                <label className="input-label">Preferred Language</label>
                <select
                  className="input"
                  value={form.preferredLanguage}
                  onChange={(e) =>
                    setForm({ ...form, preferredLanguage: e.target.value })
                  }
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary justify-center mt-2 py-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Your personal AI agent — voice, memory, tasks, and more.
        </p>
      </div>
    </div>
  );
}
