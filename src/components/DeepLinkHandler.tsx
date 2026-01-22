import { useDeepLinkHandler } from '@/hooks/useDeepLink';

/**
 * Deep Link Provider Component
 * 
 * This component sets up deep link handling for the app.
 * It should be placed inside the Router but wraps the main app content.
 */
export function DeepLinkHandler({ children }: { children: React.ReactNode }) {
  // Initialize deep link handling
  useDeepLinkHandler();

  return <>{children}</>;
}
