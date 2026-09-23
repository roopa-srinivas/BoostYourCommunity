import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Below this width the app name is hidden so the five tabs fit on one line.
const SHOW_BRAND_MIN_WIDTH = 640;

export default function AppTabs() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < SHOW_BRAND_MIN_WIDTH;
  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />
      {/* Not `asChild`: in this expo-router version TabList hands an asChild
          child a style array, which the slot rejects. */}
      <TabList
        style={[
          styles.tabList,
          narrow && styles.tabListNarrow,
          { borderTopColor: theme.border, backgroundColor: theme.background },
        ]}>
        {!narrow ? (
          <ThemedText type="sectionTitle" style={styles.brand}>
            boost your community
          </ThemedText>
        ) : null}
        <TabTrigger name="give" href="/" asChild>
          <TabButton narrow={narrow}>give</TabButton>
        </TabTrigger>
        <TabTrigger name="pledges" href="/pledges" asChild>
          <TabButton narrow={narrow}>my pledges</TabButton>
        </TabTrigger>
        <TabTrigger name="community" href="/community" asChild>
          <TabButton narrow={narrow}>community</TabButton>
        </TabTrigger>
        <TabTrigger name="organization" href="/organization" asChild>
          <TabButton narrow={narrow}>organization</TabButton>
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton narrow={narrow}>profile</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, narrow, ...props }: TabTriggerSlotProps & { narrow: boolean }) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'tintSoft' : 'background'}
        style={[styles.tabButton, narrow && styles.tabButtonNarrow]}>
        <ThemedText
          type="small"
          themeColor={isFocused ? 'tint' : 'textSecondary'}
          style={narrow && styles.labelNarrow}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flex: 1 },
  slot: { flex: 1 },
  tabList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  brand: { marginRight: Spacing.three },
  tabListNarrow: { gap: Spacing.half, paddingHorizontal: Spacing.one, flexWrap: 'nowrap' },
  tabButtonNarrow: { paddingHorizontal: 6 },
  labelNarrow: { fontSize: 13 },
  tabButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: { opacity: 0.7 },
});
