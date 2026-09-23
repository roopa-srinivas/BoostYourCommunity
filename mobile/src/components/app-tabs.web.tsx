import {
  TabList,
  TabSlot,
  TabTrigger,
  Tabs,
  type TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();
  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />
      {/* Not `asChild`: in this expo-router version TabList hands an asChild
          child a style array, which the slot rejects. */}
      <TabList style={[styles.tabList, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <ThemedText type="sectionTitle" style={styles.brand}>
          boost your community
        </ThemedText>
        <TabTrigger name="give" href="/" asChild>
          <TabButton>give</TabButton>
        </TabTrigger>
        <TabTrigger name="pledges" href="/pledges" asChild>
          <TabButton>my pledges</TabButton>
        </TabTrigger>
        <TabTrigger name="organization" href="/organization" asChild>
          <TabButton>organization</TabButton>
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton>profile</TabButton>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={isFocused ? 'tintSoft' : 'background'} style={styles.tabButton}>
        <ThemedText type="small" themeColor={isFocused ? 'tint' : 'textSecondary'}>
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
  tabButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: { opacity: 0.7 },
});
