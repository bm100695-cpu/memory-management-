import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  /**
   * Initialize authentication on app load.
   * Checks for stored JWT accessToken and validates it with backend GET /auth/me.
   * If token is missing, expired, or invalid, sets unauthenticated state.
   * Never falls back to demo accounts or automatic login.
   */
  init: async () => {
    const token = localStorage.getItem('accessToken');

    // Purge any legacy demo tokens or mock users immediately
    if (!token || token === 'local-demo-token') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('demoUser');
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      if (data?.data?.user) {
        set({ user: data.data.user, isAuthenticated: true, isLoading: false });
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      // Invalid or expired token: clear stored credentials
      localStorage.removeItem('accessToken');
      localStorage.removeItem('demoUser');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  /**
   * Log in with verified email and password credentials via backend.
   */
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (!data?.data?.accessToken || !data?.data?.user) {
      throw new Error(data?.message || 'Login failed. Missing credentials.');
    }

    localStorage.setItem('accessToken', data.data.accessToken);
    set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    return data.data.user;
  },

  /**
   * Google Sign-In with verified OAuth credential (ID token).
   */
  loginWithGoogle: async (credential) => {
    if (!credential) {
      throw new Error('Google credential token is required');
    }

    const { data } = await api.post('/auth/google', { credential });
    if (!data?.data?.accessToken || !data?.data?.user) {
      throw new Error(data?.message || 'Google login failed');
    }

    localStorage.setItem('accessToken', data.data.accessToken);
    set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    return data.data.user;
  },

  /**
   * Register a new user securely via backend.
   */
  register: async (name, email, password, preferredLanguage) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      preferredLanguage,
    });

    if (!data?.data?.accessToken || !data?.data?.user) {
      throw new Error(data?.message || 'Registration failed');
    }

    localStorage.setItem('accessToken', data.data.accessToken);
    set({ user: data.data.user, isAuthenticated: true, isLoading: false });
    return data.data.user;
  },

  /**
   * Log out securely: calls backend to invalidate refresh token and clears local storage.
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout to allow offline local cleanup
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('demoUser');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));
