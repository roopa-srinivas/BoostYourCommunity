import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapButton } from '@/components/map-button';
import { NeedCard } from '@/components/need-card';
import { PinMap } from '@/components/pin-map';
import type { NeedsMapProps } from '@/components/pin-map-types';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lower } from '@/lib/format';


/**
 * One pin per organization; tapping a pin filters the list to its needs.
 * Tapping anywhere else on the map (or the expand button) opens it full screen.
 */
export function NeedsMap(props: NeedsMapProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <PinMap
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
        <FullScreenMap {...props} onClose={() => setExpanded(false)} />
      </Modal>
    </View>
  );
}

function FullScreenMap({ onClose, ...props }: NeedsMapProps & { onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const selectedNeeds = props.needs.filter((need) => need.organization_id === props.selectedOrganizationId);
  const selected = selectedNeeds[0];

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <PinMap
        {...props}
        style={styles.fill}
        interactive
        controlsTop={insets.top + Spacing.two}
        onPressMap={() => props.onSelectOrganization(null)}
      />
      <MapButton
        icon="close"
        label="close the map"
        size={44}
        onPress={onClose}
        style={[styles.close, { top: insets.top + Spacing.two }]}
      />

      {selected ? (
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + Spacing.three,
              backgroundColor: theme.background,
              boxShadow: `0 -2px 8px ${theme.shadow}`,
            },
          ]}>
          <View style={styles.sheetHeader}>
            <ThemedText type="sectionTitle" style={styles.flex} numberOfLines={1}>
              {lower(selected.organization_name)}
            </ThemedText>
            <ThemedText
              type="link"
              accessibilityRole="link"
              onPress={() => {
                onClose();
                router.push({ pathname: '/org/[id]', params: { id: selected.organization_id } });
              }}>
              their page ›
            </ThemedText>
          </View>
          <ScrollView contentContainerStyle={styles.sheetList}>
            {selectedNeeds.map((need) => (
              <NeedCard
                key={need.need_id}
                need={need}
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/need/[id]', params: { id: need.need_id } });
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={[styles.hint, { bottom: insets.bottom + Spacing.four, backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">tap a pin to see what they need</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  small: { height: 240, borderRadius: Radius.card, overflow: 'hidden' },
  fill: { flex: 1 },
  flex: { flex: 1 },
  expand: { top: Spacing.two, right: Spacing.two },
  close: { left: Spacing.three },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '50%',
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    gap: Spacing.two,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  sheetList: { gap: Spacing.two },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
