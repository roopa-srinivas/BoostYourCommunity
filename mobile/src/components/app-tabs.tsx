import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors, FontFamily } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      tintColor={colors.tint}
      labelStyle={{
        default: { fontFamily: FontFamily.medium },
        selected: { color: colors.tint, fontFamily: FontFamily.bold },
      }}>
      <NativeTabs.Trigger name="(give)">
        <NativeTabs.Trigger.Label>give</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="heart.fill" md="volunteer_activism" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pledges">
        <NativeTabs.Trigger.Label>my pledges</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="community">
        <NativeTabs.Trigger.Label>community</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="organization">
        <NativeTabs.Trigger.Label>organization</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="building.2.fill" md="domain" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
