'use client';

import React from 'react';
import { PerformanceDashboard } from '@/components/features/PerformanceDashboard';
import { GlassContainer } from '@/components/ui/GlassContainer';

export default function PerformanceMonitoringDemo() {
  return (
    <GlassContainer className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Performance Monitoring Demo
          </h1>
          <p className="text-gray-300 text-lg">
            Real-time performance monitoring dashboard with metrics collection,
            auto-scaling, and optimization recommendations.
          </p>
        </div>

        <PerformanceDashboard />
      </div>
    </GlassContainer>
  );
}