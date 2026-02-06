import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type OnboardingStep = 
  | 'mycard-edit' 
  | 'mycard-share' 
  | 'dashboard-stats'
  | 'crm-contacts'
  | 'completed';

interface OnboardingState {
  shouldShowTour: boolean;
  currentStep: OnboardingStep;
  isCompleted: boolean;
  isLoading: boolean;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    shouldShowTour: false,
    currentStep: 'mycard-edit',
    isCompleted: false,
    isLoading: true,
  });

  // Load onboarding state from database
  useEffect(() => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const loadOnboardingState = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, onboarding_step')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        const isCompleted = data?.onboarding_completed ?? false;
        const currentStep = (data?.onboarding_step as OnboardingStep) || 'mycard-edit';

        // Check localStorage for session-based skip
        const localSkipped = localStorage.getItem(`onboarding_skipped_${user.id}`);

        setState({
          shouldShowTour: !isCompleted && !localSkipped,
          currentStep,
          isCompleted,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error loading onboarding state:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadOnboardingState();
  }, [user?.id]);

  // Save step to database
  const saveStep = useCallback(async (step: OnboardingStep, completed: boolean = false) => {
    if (!user?.id) return;

    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_step: step,
          onboarding_completed: completed,
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving onboarding step:', error);
    }
  }, [user?.id]);

  // Start tour
  const startTour = useCallback(() => {
    setState(prev => ({
      ...prev,
      shouldShowTour: true,
      currentStep: 'mycard-edit',
    }));
  }, []);

  // Skip tour
  const skipTour = useCallback(async () => {
    if (user?.id) {
      localStorage.setItem(`onboarding_skipped_${user.id}`, 'true');
      await saveStep('completed', true);
    }
    setState(prev => ({
      ...prev,
      shouldShowTour: false,
      isCompleted: true,
    }));
  }, [user?.id, saveStep]);

  // Complete tour
  const completeTour = useCallback(async () => {
    await saveStep('completed', true);
    setState(prev => ({
      ...prev,
      shouldShowTour: false,
      isCompleted: true,
      currentStep: 'completed',
    }));
  }, [saveStep]);

  // Move to next step
  const nextStep = useCallback(async () => {
    const steps: OnboardingStep[] = ['mycard-edit', 'mycard-share'];
    const currentIndex = steps.indexOf(state.currentStep);
    
    if (currentIndex < steps.length - 1) {
      const newStep = steps[currentIndex + 1];
      await saveStep(newStep);
      setState(prev => ({ ...prev, currentStep: newStep }));
    } else {
      await completeTour();
    }
  }, [state.currentStep, saveStep, completeTour]);

  // Complete specific step
  const completeStep = useCallback(async (step: OnboardingStep) => {
    await saveStep(step);
    setState(prev => ({ ...prev, currentStep: step }));
  }, [saveStep]);

  // Reset onboarding (for testing)
  const resetOnboarding = useCallback(async () => {
    if (!user?.id) return;

    localStorage.removeItem(`onboarding_skipped_${user.id}`);
    await saveStep('mycard-edit', false);
    setState({
      shouldShowTour: true,
      currentStep: 'mycard-edit',
      isCompleted: false,
      isLoading: false,
    });
  }, [user?.id, saveStep]);

  return {
    ...state,
    startTour,
    skipTour,
    completeTour,
    nextStep,
    completeStep,
    resetOnboarding,
  };
}
