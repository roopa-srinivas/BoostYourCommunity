import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleMap } from '@/components/circle-map';
import type { HeatMapProps } from '@/components/circle-map-types';
import { MapButton } from '@/components/map-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';


/**
 * Terracotta circles over each organization, bigger and stronger where more
 * was given. Tapping the map (or the expand button) opens it full screen.
 */
export function HeatMap(props: HeatMapProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <CircleMap
        {...props}
        style={styles.small}
        interactive={false}
        controlsTop={Spacing.two + 44}
        onPressMap={() => setExpanded(true)}
      />
      <MapButton icon="expand" label="expand the map" onPress={() => setExpanded(true)} style={styles.expand} />
      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setExpanded(false)}>
        <View style={[styles.fill, { backgroundColor: theme.background }]}>
          <CircleMap {...props} style={styles.fill} interactive controlsTop={insets.top + Spacing.two} />
          <MapButton
            icon="close"
            label="close the map"
            size={44}
            onPress={() => setExpanded(false)}
            style={[styles.close, { top: insets.top + Spacing.two }]}
          />
          <View
            style={[styles.hint, { bottom: insets.bottom + Spacing.four, backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">bigger, darker circles: more given there lately</ThemedText>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  small: { height: 220, borderRadius: Radius.card, overflow: 'hidden' },
  fill: { flex: 1 },
  expand: { top: Spacing.two, right: Spacing.two },
  close: { left: Spacing.three },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
