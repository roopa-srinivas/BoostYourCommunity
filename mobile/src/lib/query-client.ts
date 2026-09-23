import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

// PostgREST/Postgres error codes that won't change on a retry: no matching
// row, permission denied, and an invalid or expired sign-in token.
const PERMANENT_ERRORS = new Set(['PGRST116', '42501', 'PGRST301', 'PGRST303']);

function isPermanent(error: unknown) {
  return !!error && typeof error === 'object' && 'code' in error && PERMANENT_ERRORS.has(String(error.code));
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry once for network blips, but not for errors a retry can't fix.
      retry: (failureCount, error) => failureCount < 1 && !isPermanent(error),
    },
  },
});

// React Query refetches stale data when the window regains focus; on native
// the equivalent is the app returning to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
}
