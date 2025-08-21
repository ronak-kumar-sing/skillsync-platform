'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { GlassModal, GlassButton, GlassCard } from '@/components/ui';

interface UserFlowContextType {
  currentFlow: string | null;
  startFlow: (flowName: string) => void;
  completeFlow: () => void;
  skipFlow: () => void;
  isFlowActive: boolean;
  flowProgress: number;
}

const UserFlowContext = createContext<UserFlowContextType | undefined>(undefined);

interface UserFlowProviderProps {
  children: ReactNode;
}

interface FlowStep {
  id: string;
  title: string;
  description: string;
  path: string;
  component?: ReactNode;
  required?: boolean;
}

const userFlows: Record<string, FlowStep[]> = {
  onboarding: [
    {
      id: 'welcome',
      title: 'Welcome to SkillSync',
      description: 'Let\'s get you started with your learning journey',
      path: '/onboarding/welcome',
      required: true
    },
    {
      id: 'profile-setup',
      title: 'Complete Your Profile',
      description: 'Add your skills and learning goals',
      path: '/profile?setup=true',
      required: true
    },
    {
      id: 'first-match',
      title: 'Find Your First Match',
      description: 'Connect with a learning partner',
      path: '/match?tutorial=true',
      required: false
    }
  ],
  'first-session': [
    {
      id: 'session-prep',
      title: 'Prepare for Your Session',
      description: 'Learn about video call features',
      path: '/session/prep',
      required: false
    },
    {
      id: 'session-start',
      title: 'Start Your Session',
      description: 'Join your first learning session',
      path: '/call',
      required: true
    }
  ],
  'profile-completion': [
    {
      id: 'add-skills',
      title: 'Add Your Skills',
      description: 'Tell us what you know and want to learn',
      path: '/profile?tab=skills',
      required: true
    },
    {
      id: 'set-goals',
      title: 'Set Learning Goals',
      description: 'Define what you want to achieve',
      path: '/profile?tab=goals',
      required: true
    },
    {
      id: 'preferences',
      title: 'Set Preferences',
      description: 'Customize your learning experience',
      path: '/profile?tab=preferences',
      required: false
    }
  ]
};

export const UserFlowProvider = ({ children }: UserFlowProviderProps) => {
  const [currentFlow, setCurrentFlow] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFlowActive, setIsFlowActive] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  // Check if user needs onboarding
  useEffect(() => {
    if (!isLoading && user && !user.isOnboarded) {
      startFlow('onboarding');
    }
  }, [user, isLoading]);

  // Check for incomplete profile
  useEffect(() => {
    if (!isLoading && user && user.isOnboarded && !user.profileComplete) {
      // Show profile completion flow after a delay
      const timer = setTimeout(() => {
        if (!currentFlow) {
          startFlow('profile-completion');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, currentFlow]);

  const startFlow = (flowName: string) => {
    if (userFlows[flowName]) {
      setCurrentFlow(flowName);
      setCurrentStepIndex(0);
      setIsFlowActive(true);
      setShowFlowModal(true);
    }
  };

  const completeFlow = () => {
    setCurrentFlow(null);
    setCurrentStepIndex(0);
    setIsFlowActive(false);
    setShowFlowModal(false);
  };

  const skipFlow = () => {
    completeFlow();
  };

  const nextStep = () => {
    if (!currentFlow) return;

    const flow = userFlows[currentFlow];
    if (currentStepIndex < flow.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      completeFlow();
    }
  };

  const goToStep = (stepPath: string) => {
    setShowFlowModal(false);
    router.push(stepPath);
  };

  const flowProgress = currentFlow
    ? ((currentStepIndex + 1) / userFlows[currentFlow].length) * 100
    : 0;

  const currentStep = currentFlow ? userFlows[currentFlow][currentStepIndex] : null;

  const contextValue: UserFlowContextType = {
    currentFlow,
    startFlow,
    completeFlow,
    skipFlow,
    isFlowActive,
    flowProgress
  };

  return (
    <UserFlowContext.Provider value={contextValue}>
      {children}

      {/* Flow Modal */}
      <AnimatePresence>
        {showFlowModal && currentStep && (
          <GlassModal
            isOpen={showFlowModal}
            onClose={() => setShowFlowModal(false)}
            title={currentStep.title}
            size="md"
          >
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/70">
                  <span>Step {currentStepIndex + 1} of {userFlows[currentFlow!].length}</span>
                  <span>{Math.round(flowProgress)}% Complete</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-primary-400 to-secondary-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${flowProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Step Content */}
              <div className="text-center space-y-4">
                <p className="text-white/80 text-lg">
                  {currentStep.description}
                </p>

                {currentStep.component && (
                  <div className="my-6">
                    {currentStep.component}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                {!currentStep.required && (
                  <GlassButton
                    variant="ghost"
                    onClick={skipFlow}
                    className="text-white/70 hover:text-white"
                  >
                    Skip for now
                  </GlassButton>
                )}

                <GlassButton
                  variant="primary"
                  onClick={() => goToStep(currentStep.path)}
                  className="flex-1 sm:flex-none"
                >
                  {currentStepIndex === userFlows[currentFlow!].length - 1 ? 'Complete' : 'Continue'}
                </GlassButton>
              </div>
            </div>
          </GlassModal>
        )}
      </AnimatePresence>

      {/* Flow Progress Indicator (when modal is closed but flow is active) */}
      <AnimatePresence>
        {isFlowActive && !showFlowModal && currentStep && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 left-6 z-50"
          >
            <GlassCard className="p-4 max-w-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium text-sm">
                    {currentFlow?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h4>
                  <button
                    onClick={() => setShowFlowModal(true)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-white/70">
                    Step {currentStepIndex + 1} of {userFlows[currentFlow!].length}
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1">
                    <div
                      className="bg-gradient-to-r from-primary-400 to-secondary-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${flowProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </UserFlowContext.Provider>
  );
};

export const useUserFlow = () => {
  const context = useContext(UserFlowContext);
  if (context === undefined) {
    throw new Error('useUserFlow must be used within a UserFlowProvider');
  }
  return context;
};