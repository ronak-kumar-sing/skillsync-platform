/**
 * Browser compatibility component for graceful degradation
 * Shows warnings and provides fallback options for unsupported browsers/devices
 */

'use client';

import { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import {
  getBrowserInfo,
  getFeatureSupport,
  isSupported,
  getFallbackOptions,
  BrowserInfo,
  FeatureSupport
} from '@/lib/browser-detection';
import { logger } from '@/lib/logging';

interface BrowserCompatibilityProps {
  children: React.ReactNode;
  level?: 'strict' | 'warning' | 'info';
  showDetails?: boolean;
  onUnsupported?: (limitations: string[]) => void;
  fallbackComponent?: React.ReactNode;
}

interface CompatibilityState {
  browserInfo: BrowserInfo | null;
  featureSupport: FeatureSupport | null;
  supportInfo: ReturnType<typeof isSupported> | null;
  fallbackOptions: ReturnType<typeof getFallbackOptions> | null;
  showWarning: boolean;
  dismissed: boolean;
}

export function BrowserCompatibility({
  children,
  level = 'warning',
  showDetails = false,
  onUnsupported,
  fallbackComponent
}: BrowserCompatibilityProps) {
  const [state, setState] = useState<CompatibilityState>({
    browserInfo: null,
    featureSupport: null,
    supportInfo: null,
    fallbackOptions: null,
    showWarning: false,
    dismissed: false
  });

  useEffect(() => {
    // Check browser compatibility
    const browserInfo = getBrowserInfo();
    const featureSupport = getFeatureSupport();
    const supportInfo = isSupported();
    const fallbackOptions = getFallbackOptions();

    setState({
      browserInfo,
      featureSupport,
      supportInfo,
      fallbackOptions,
      showWarning: !supportInfo.supported || supportInfo.limitations.length > 0,
      dismissed: false
    });

    // Log compatibility information
    logger.info('Browser compatibility check', {
      component: 'BrowserCompatibility',
      action: 'compatibility_check',
      metadata: {
        browserInfo: {
          name: browserInfo.name,
          version: browserInfo.version,
          platform: browserInfo.platform,
          isMobile: browserInfo.isMobile
        },
        supported: supportInfo.supported,
        limitations: supportInfo.limitations,
        level
      }
    });

    // Call unsupported callback if needed
    if (!supportInfo.supported && onUnsupported) {
      onUnsupported(supportInfo.limitations);
    }
  }, [level, onUnsupported]);

  const handleDismiss = () => {
    setState(prev => ({ ...prev, dismissed: true }));

    // Store dismissal in localStorage
    try {
      localStorage.setItem('skillsync_compatibility_dismissed', 'true');
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const handleIgnoreAndContinue = () => {
    logger.userAction('ignore_compatibility_warning', {
      component: 'BrowserCompatibility',
      metadata: {
        browserName: state.browserInfo?.name,
        limitations: state.supportInfo?.limitations
      }
    });

    handleDismiss();
  };

  // Check if warning was previously dismissed
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('skillsync_compatibility_dismissed') === 'true';
      if (dismissed && level !== 'strict') {
        setState(prev => ({ ...prev, dismissed: true }));
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [level]);

  // Don't show anything if browser is fully supported
  if (!state.showWarning || state.dismissed) {
    return <>{children}</>;
  }

  // Show fallback component for strict mode with unsupported browser
  if (level === 'strict' && !state.supportInfo?.supported && fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  // Render compatibility warning
  return (
    <>
      <CompatibilityWarning
        browserInfo={state.browserInfo}
        supportInfo={state.supportInfo}
        fallbackOptions={state.fallbackOptions}
        level={level}
        showDetails={showDetails}
        onDismiss={handleDismiss}
        onIgnore={handleIgnoreAndContinue}
      />
      {children}
    </>
  );
}

interface CompatibilityWarningProps {
  browserInfo: BrowserInfo | null;
  supportInfo: ReturnType<typeof isSupported> | null;
  fallbackOptions: ReturnType<typeof getFallbackOptions> | null;
  level: 'strict' | 'warning' | 'info';
  showDetails: boolean;
  onDismiss: () => void;
  onIgnore: () => void;
}

function CompatibilityWarning({
  browserInfo,
  supportInfo,
  fallbackOptions,
  level,
  showDetails,
  onDismiss,
  onIgnore
}: CompatibilityWarningProps) {
  const [showFullDetails, setShowFullDetails] = useState(false);

  if (!browserInfo || !supportInfo) return null;

  const isUnsupported = !supportInfo.supported;
  const hasLimitations = supportInfo.limitations.length > 0;

  // Determine warning style based on level and support
  const getWarningStyle = () => {
    if (level === 'strict' && isUnsupported) {
      return {
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        iconColor: 'text-red-400',
        titleColor: 'text-red-300'
      };
    } else if (hasLimitations) {
      return {
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        iconColor: 'text-yellow-400',
        titleColor: 'text-yellow-300'
      };
    } else {
      return {
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        iconColor: 'text-blue-400',
        titleColor: 'text-blue-300'
      };
    }
  };

  const style = getWarningStyle();

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto">
      <GlassCard
        variant="medium"
        blur="lg"
        className={`p-4 ${style.bgColor} border ${style.borderColor}`}
      >
        <div className="flex items-start space-x-3">
          {/* Warning Icon */}
          <div className={`flex-shrink-0 ${style.iconColor}`}>
            {isUnsupported ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className={`text-sm font-medium ${style.titleColor}`}>
              {isUnsupported
                ? 'Browser Not Fully Supported'
                : hasLimitations
                  ? 'Limited Browser Support'
                  : 'Browser Information'
              }
            </h3>

            {/* Browser Info */}
            <p className="text-white/70 text-sm mt-1">
              {browserInfo.name} {browserInfo.version} on {browserInfo.platform}
              {browserInfo.isMobile && ' (Mobile)'}
            </p>

            {/* Limitations */}
            {supportInfo.limitations.length > 0 && (
              <div className="mt-2">
                <p className="text-white/80 text-sm font-medium mb-1">Limitations:</p>
                <ul className="text-white/70 text-sm space-y-1">
                  {supportInfo.limitations.slice(0, showFullDetails ? undefined : 2).map((limitation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-white/50 mr-2">•</span>
                      {limitation}
                    </li>
                  ))}
                </ul>
                {supportInfo.limitations.length > 2 && !showFullDetails && (
                  <button
                    onClick={() => setShowFullDetails(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm mt-1"
                  >
                    Show {supportInfo.limitations.length - 2} more...
                  </button>
                )}
              </div>
            )}

            {/* Recommendations */}
            {supportInfo.recommendations.length > 0 && (
              <div className="mt-2">
                <p className="text-white/80 text-sm font-medium mb-1">Recommendations:</p>
                <ul className="text-white/70 text-sm space-y-1">
                  {supportInfo.recommendations.slice(0, 2).map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fallback Options */}
            {showDetails && fallbackOptions && (
              <div className="mt-3 space-y-2">
                {Object.entries(fallbackOptions).map(([feature, options]) => {
                  if (options.length === 0) return null;

                  return (
                    <div key={feature}>
                      <p className="text-white/80 text-sm font-medium capitalize">
                        {feature.replace(/([A-Z])/g, ' $1')} Alternatives:
                      </p>
                      <ul className="text-white/60 text-xs space-y-1 ml-4">
                        {options.map((option, index) => (
                          <li key={index}>• {option}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-white/50 hover:text-white/80 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {level !== 'strict' && (
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={onIgnore}
              className="text-xs"
            >
              Continue Anyway
            </GlassButton>
          )}

          {showDetails !== showFullDetails && (
            <GlassButton
              variant="outline"
              size="sm"
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="text-xs"
            >
              {showFullDetails ? 'Show Less' : 'Show Details'}
            </GlassButton>
          )}

          <GlassButton
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="text-xs"
          >
            Dismiss
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}

/**
 * Hook for browser compatibility checking
 */
export function useBrowserCompatibility() {
  const [compatibility, setCompatibility] = useState<{
    browserInfo: BrowserInfo | null;
    featureSupport: FeatureSupport | null;
    isSupported: boolean;
    limitations: string[];
    recommendations: string[];
  }>({
    browserInfo: null,
    featureSupport: null,
    isSupported: true,
    limitations: [],
    recommendations: []
  });

  useEffect(() => {
    const browserInfo = getBrowserInfo();
    const featureSupport = getFeatureSupport();
    const supportInfo = isSupported();

    setCompatibility({
      browserInfo,
      featureSupport,
      isSupported: supportInfo.supported,
      limitations: supportInfo.limitations,
      recommendations: supportInfo.recommendations
    });
  }, []);

  return compatibility;
}

export default BrowserCompatibility;