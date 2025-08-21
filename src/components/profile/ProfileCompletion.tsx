'use client';

import React, { useEffect, useState } from 'react';
import { ProfileCompletionStatus } from '@/types';

interface ProfileCompletionProps {
  userId: string;
  onStepClick?: (stepId: string) => void;
}

export default function ProfileCompletion({ userId, onStepClick }: ProfileCompletionProps) {
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompletionStatus();
  }, [userId]);

  const fetchCompletionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile/completion', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch completion status');
      }

      const data = await response.json();
      setCompletionStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="h-2 bg-white/20 rounded w-full mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-md rounded-xl p-6 border border-red-500/20">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={fetchCompletionStatus}
          className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!completionStatus) {
    return null;
  }

  const getStepIcon = (completed: boolean) => {
    return completed ? (
      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ) : (
      <div className="w-6 h-6 bg-white/20 rounded-full border-2 border-white/40"></div>
    );
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Profile Completion</h3>
        <span className="text-sm text-white/70">
          {completionStatus.completionPercentage}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/20 rounded-full h-2 mb-6">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${completionStatus.completionPercentage}%` }}
        ></div>
      </div>

      {/* Completion Steps */}
      <div className="space-y-3">
        {completionStatus.requiredSteps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${step.completed
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-white/5 border-white/20 hover:bg-white/10 cursor-pointer'
              }`}
            onClick={() => !step.completed && onStepClick?.(step.id)}
          >
            <div className="flex-shrink-0 mr-3">
              {getStepIcon(step.completed)}
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium">{step.title}</h4>
              <p className="text-white/70 text-sm">{step.description}</p>
            </div>
            {step.required && (
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                Required
              </span>
            )}
          </div>
        ))}
      </div>

      {completionStatus.isComplete && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-400 font-medium">
              Profile Complete! You can now start matching with other learners.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}