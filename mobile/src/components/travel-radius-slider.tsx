import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { TRAVEL_RADIUS_MILES, type TravelRadius } from '@/lib/travel-radius';

/**
 * A bar to drag between the travel distances, snapping to each one. The
 * label follows the thumb while dragging; the search updates on release.
 */
export function TravelRadiusSlider({
  value,
  onChange,
}: {
  value: TravelRadius;
  onChange: (miles: TravelRadius) => void;
}) {
  const theme = useTheme();
  const [dragging, setDragging] = useState<TravelRadius | null>(null);
  const shown = dragging ?? value;
  const last = TRAVEL_RADIUS_MILES.length - 1;
  const at = (index: number) => TRAVEL_RADIUS_MILES[Math.round(Math.min(Math.max(index, 0), last))];

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary">
        how far will you travel to drop off? <ThemedText type="smallBold">{shown} mi</ThemedText>
      </ThemedText>
      <Slider
        accessibilityLabel="how far you'll travel to drop off"
        accessibilityValue={{ text: `${shown} miles` }}
        minimumValue={0}
        maximumValue={last}
        step={1}
        value={TRAVEL_RADIUS_MILES.indexOf(value)}
        onValueChange={(index) => setDragging(at(index))}
        onSlidingComplete={(index) => {
          setDragging(null);
          onChange(at(index));
        }}
        minimumTrackTintColor={theme.tint}
        maximumTrackTintColor={theme.backgroundSelected}
        thumbTintColor={theme.tint}
        style={styles.slider}
      />
      <View style={styles.ticks}>
        {TRAVEL_RADIUS_MILES.map((miles) => (
          <ThemedText
            key={miles}
            type={miles === shown ? 'smallBold' : 'small'}
            themeColor={miles === shown ? 'tint' : 'textSecondary'}
            style={styles.tick}>
            {miles}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  slider: { width: '100%', height: 40 },
  // Slider thumbs don't reach the very ends, so inset the labels to line up.
  ticks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.one },
  tick: { width: 24, textAlign: 'center' },
});
