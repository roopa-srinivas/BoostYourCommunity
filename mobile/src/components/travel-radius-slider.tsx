import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_TRAVEL_MILES, MIN_TRAVEL_MILES, TRAVEL_RADIUS_MARKS } from '@/lib/travel-radius';

// The slider's thumb stops this far in from each end, so marks are placed
// within the same inset to line up with it.
const THUMB_INSET = 12;
const MARK_WIDTH = 28;

/**
 * A bar to drag to any whole number of miles. The label follows the thumb
 * while dragging; the search updates on release. Tapping a mark jumps to it.
 */
export function TravelRadiusSlider({ value, onChange }: { value: number; onChange: (miles: number) => void }) {
  const theme = useTheme();
  const [dragging, setDragging] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const shown = dragging ?? value;
  const span = MAX_TRAVEL_MILES - MIN_TRAVEL_MILES;
  const markLeft = (miles: number) =>
    THUMB_INSET + ((miles - MIN_TRAVEL_MILES) / span) * Math.max(0, width - THUMB_INSET * 2) - MARK_WIDTH / 2;

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary">
        how far will you travel to drop off?{' '}
        <ThemedText type="smallBold">
          {shown} {shown === 1 ? 'mile' : 'miles'}
        </ThemedText>
      </ThemedText>
      <Slider
        accessibilityLabel="how far you'll travel to drop off"
        accessibilityValue={{ min: MIN_TRAVEL_MILES, max: MAX_TRAVEL_MILES, now: shown, text: `${shown} miles` }}
        minimumValue={MIN_TRAVEL_MILES}
        maximumValue={MAX_TRAVEL_MILES}
        step={1}
        value={value}
        onValueChange={(miles) => setDragging(Math.round(miles))}
        onSlidingComplete={(miles) => {
          setDragging(null);
          onChange(Math.round(miles));
        }}
        minimumTrackTintColor={theme.tint}
        maximumTrackTintColor={theme.backgroundSelected}
        thumbTintColor={theme.tint}
        style={styles.slider}
      />
      <View style={styles.marks} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0
          ? TRAVEL_RADIUS_MARKS.map((miles) => (
              <ThemedText
                key={miles}
                type={miles === shown ? 'smallBold' : 'small'}
                themeColor={miles === shown ? 'tint' : 'textSecondary'}
                accessibilityRole="button"
                accessibilityLabel={`${miles} miles`}
                onPress={() => onChange(miles)}
                style={[styles.mark, { left: markLeft(miles) }]}>
                {miles}
              </ThemedText>
            ))
          : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  slider: { width: '100%', height: 40 },
  marks: { height: 24 },
  mark: { position: 'absolute', width: MARK_WIDTH, textAlign: 'center' },
});
