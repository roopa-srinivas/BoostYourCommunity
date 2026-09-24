import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Button } from '@/components/ui/button';
import { shareNeed, type ShareableNeed } from '@/lib/share';

/** "share with friends": the share sheet on phones, a copied link on desktop browsers. */
export function ShareNeedButton({
  need,
  label = 'share with friends',
  variant = 'secondary',
  style,
}: {
  need: ShareableNeed;
  label?: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function share() {
    try {
      const result = await shareNeed(need);
      setStatus(result === 'copied' ? 'copied' : 'idle');
    } catch {
      setStatus('failed');
    }
  }

  const shown = status === 'copied' ? 'link copied' : status === 'failed' ? 'couldn’t share, try again' : label;
  return <Button variant={variant} label={shown} style={style} onPress={share} />;
}
