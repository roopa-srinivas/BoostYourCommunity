import { useAppearance } from '@/providers/appearance-provider';

/** The color scheme showing now: the person's choice on Profile, or the device's. */
export function useColorScheme() {
  return useAppearance().scheme;
}
