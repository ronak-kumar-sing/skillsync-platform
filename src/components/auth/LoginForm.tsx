'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginRequest } from '@/types';
import { GlassButton, GlassInput } from '@/components/ui';

interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function LoginForm({ onSuccess, className = '' }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear global error
    if (error) {
      clearError();
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the useAuth hook
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
          Email
        </label>
        <GlassInput
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          disabled={isLoading}
          className={formErrors.email ? 'border-red-500/50' : ''}
        />
        {formErrors.email && (
          <p className="mt-1 text-sm text-red-400">{formErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
          Password
        </label>
        <GlassInput
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          disabled={isLoading}
          className={formErrors.password ? 'border-red-500/50' : ''}
        />
        {formErrors.password && (
          <p className="mt-1 text-sm text-red-400">{formErrors.password}</p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <GlassButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </GlassButton>

      {/* Additional Links */}
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="text-white/60 hover:text-white transition-colors"
          disabled={isLoading}
        >
          Forgot password?
        </button>
        <span className="text-white/60">
          Need help?{' '}
          <button
            type="button"
            className="text-primary-400 hover:text-primary-300 transition-colors"
            disabled={isLoading}
          >
            Contact support
          </button>
        </span>
      </div>
    </form>
  );
}