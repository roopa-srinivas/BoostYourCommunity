import { router, type Href } from 'expo-router';

/**
 * Goes back, or to `fallback` when there's nothing to go back to (e.g. the
 * page was opened directly or refreshed on web).
 */
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
