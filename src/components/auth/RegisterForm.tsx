'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RegisterRequest } from '@/types';
import { GlassButton, GlassInput, GlassSelect } from '@/components/ui';

interface RegisterFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function RegisterForm({ onSuccess, className = '' }: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    username: '',
    password: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

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

    if (!formData.username) {
      errors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9]{3,30}$/.test(formData.username)) {
      errors.username = 'Username must be 3-30 characters and contain only letters and numbers';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.timezone) {
      errors.timezone = 'Timezone is required';
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
      await register(formData);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the useAuth hook
      console.error('Registration failed:', error);
    }
  };

  // Common timezones for the dropdown
  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];

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
        <label htmlFor="username" className="block text-sm font-medium text-white mb-2">
          Username
        </label>
        <GlassInput
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Choose a username"
          disabled={isLoading}
          className={formErrors.username ? 'border-red-500/50' : ''}
        />
        {formErrors.username && (
          <p className="mt-1 text-sm text-red-400">{formErrors.username}</p>
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
          placeholder="Create a password"
          disabled={isLoading}
          className={formErrors.password ? 'border-red-500/50' : ''}
        />
        {formErrors.password && (
          <p className="mt-1 text-sm text-red-400">{formErrors.password}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
          Confirm Password
        </label>
        <GlassInput
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          disabled={isLoading}
          className={formErrors.confirmPassword ? 'border-red-500/50' : ''}
        />
        {formErrors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{formErrors.confirmPassword}</p>
        )}
      </div>

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-white mb-2">
          Timezone
        </label>
        <GlassSelect
          id="timezone"
          name="timezone"
          value={formData.timezone}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Select your timezone"
          options={[
            { value: '', label: 'Select your timezone' },
            ...commonTimezones.map(tz => ({ value: tz, label: tz }))
          ]}
          className={formErrors.timezone ? 'border-red-500/50' : ''}
        />
        {formErrors.timezone && (
          <p className="mt-1 text-sm text-red-400">{formErrors.timezone}</p>
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
        {isLoading ? 'Creating account...' : 'Create Account'}
      </GlassButton>

      {/* Terms and Privacy */}
      <div className="text-center text-xs text-white/60">
        By creating an account, you agree to our{' '}
        <button
          type="button"
          className="text-primary-400 hover:text-primary-300 transition-colors underline"
          disabled={isLoading}
        >
          Terms of Service
        </button>{' '}
        and{' '}
        <button
          type="button"
          className="text-primary-400 hover:text-primary-300 transition-colors underline"
          disabled={isLoading}
        >
          Privacy Policy
        </button>
      </div>
    </form>
  );
}