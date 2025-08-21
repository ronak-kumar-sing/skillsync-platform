'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthUser, LoginRequest, RegisterRequest, AuthResponse } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function useAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Get stored token
  const getStoredToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken');
    }
    return null;
  }, []);

  // Store token
  const storeToken = useCallback((token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }, []);

  // Remove token
  const removeToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }, []);

  // API call helper
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = getStoredToken();

    const response = await fetch(`${API_BASE_URL}/api/auth${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }, [getStoredToken]);

  // Load user from token
  const loadUser = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await apiCall('/me');
      setState(prev => ({
        ...prev,
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to load user:', error);
      removeToken();
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }));
    }
  }, [apiCall, getStoredToken, removeToken]);

  // Login function
  const login = useCallback(async (credentials: LoginRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      const authData: AuthResponse = response.data;

      storeToken(authData.accessToken);

      setState(prev => ({
        ...prev,
        user: authData.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [apiCall, storeToken]);

  // Register function
  const register = useCallback(async (userData: RegisterRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiCall('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      const authData: AuthResponse = response.data;

      storeToken(authData.accessToken);

      setState(prev => ({
        ...prev,
        user: authData.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [apiCall, storeToken]);

  // Logout function
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await apiCall('/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeToken();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [apiCall, removeToken]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const response = await apiCall('/refresh', { method: 'POST' });

      storeToken(response.data.accessToken);

      // Reload user data
      await loadUser();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  }, [apiCall, storeToken, loadUser, logout]);

  // Clear error function
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Set up token refresh interval
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Refresh token every 10 minutes (tokens expire in 15 minutes)
    const interval = setInterval(() => {
      refreshToken();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshToken]);

  return {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
  };
}