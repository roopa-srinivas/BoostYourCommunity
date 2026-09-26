import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { useIsAdmin, useOrganizationsToReview } from '@/api/admin';
import { useFollowCounts } from '@/api/community';
import { useMyPledges } from '@/api/pledges';
import { useDeleteAccount, useProfile, useSetHideFromLeaderboard, useUpdateDisplayName } from '@/api/profile';
import { BadgeTile } from '@/components/badge-tile';
import { LegalLinks } from '@/components/legal-links';
import { YearInGivingCard } from '@/components/year-in-giving';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Loading } from '@/components/ui/message';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Screen } from '@/components/ui/screen';
import { StatTile } from '@/components/ui/stat-tile';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeBadges } from '@/lib/badges';
import { confirm } from '@/lib/confirm';
import { errorMessage, formatQuantity } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session } = useAuth();
  const profile = useProfile();
  const pledges = useMyPledges();
  const followCounts = useFollowCounts();
  const isAdmin = useIsAdmin();
  const toReview = useOrganizationsToReview(isAdmin.data === true);
  const deleteAccount = useDeleteAccount();
  const updateName = useUpdateDisplayName();
  const setHidden = useSetHideFromLeaderboard();
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const badges = useMemo(
    () =>
      computeBadges(
        (pledges.data ?? [])
          .filter((p) => p.status === 'received' && p.resolved_at)
          .map((p) => ({ quantity: p.quantity, resolvedAt: new Date(p.resolved_at!) })),
      ),
    [pledges.data],
  );

  if (profile.isPending) return <Loading />;

  const all = pledges.data ?? [];
  // Only drop-offs the organization confirmed count toward stats.
  const receivedPledges = all.filter((p) => p.status === 'received');
  const itemsDonated = receivedPledges.reduce((sum, p) => sum + p.quantity, 0);
  const upcoming = all.filter((p) => p.status === 'pledged').length;

  const pendingCount = (toReview.data ?? []).filter((o) => o.status === 'pending').length;

  async function confirmDeleteAccount() {
    const ok = await confirm(
      'delete your account?',
      'this permanently deletes your account, your pledges and who you follow. it can’t be undone.',
      'delete account',
    );
    if (ok) deleteAccount.mutate();
  }

  async function saveName() {
    try {
      await updateName.mutateAsync(name.trim());
      setEditing(false);
    } catch {
      // Shown below from updateName.error.
    }
  }

  return (
    <Screen title="profile">
      {profile.error ? <ErrorText>{errorMessage(profile.error)}</ErrorText> : null}

      {editing ? (
        <View style={styles.section}>
          <TextField label="your name" value={name} onChangeText={setName} autoFocus maxLength={60} />
          {updateName.error ? <ErrorText>{errorMessage(updateName.error)}</ErrorText> : null}
          <View style={styles.row}>
            <Button variant="secondary" label="cancel" style={styles.flex} onPress={() => setEditing(false)} />
            <Button
              label="save"
              style={styles.flex}
              disabled={!name.trim()}
              loading={updateName.isPending}
              onPress={saveName}
            />
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <ThemedText type="subtitle">{profile.data?.display_name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {session?.user.email}
          </ThemedText>
          <ThemedText type="link" accessibilityRole="button" onPress={() => router.push('/people')}>
            {followCounts.data
              ? `${followCounts.data.followers} ${followCounts.data.followers === 1 ? 'follower' : 'followers'} · ${followCounts.data.following} following`
              : ' '}
          </ThemedText>
          <Button
            variant="secondary"
            label="change name"
            style={styles.start}
            onPress={() => {
              setName(profile.data?.display_name ?? '');
              setEditing(true);
            }}
          />
        </View>
      )}

      <View style={styles.row}>
        <StatTile value={receivedPledges.length} label={'drop-offs\nconfirmed'} />
        <StatTile value={itemsDonated} label={'items\ndonated'} />
        <StatTile value={upcoming} label={'upcoming\ndrop-offs'} />
      </View>

      {pledges.data ? <YearInGivingCard pledges={pledges.data} /> : null}

      <View style={styles.section}>
        <ThemedText type="sectionTitle">badges</ThemedText>
        {badges.next ? (
          <Card style={styles.next}>
            <ThemedText type="small" themeColor="textSecondary">
              next: <ThemedText type="smallBold">{badges.next.title}</ThemedText>
            </ThemedText>
            <ProgressBar
              value={badges.total / badges.next.milestone}
              accessibilityLabel={`${badges.total} of ${badges.next.milestone} items`}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {formatQuantity(badges.next.milestone - badges.total, 'items')} to go. only confirmed drop-offs count.
            </ThemedText>
          </Card>
        ) : null}
        {badges.earned.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            your first badge comes with your first confirmed drop-off.
          </ThemedText>
        ) : (
          <View style={styles.grid}>
            {[...badges.earned].reverse().map((badge) => (
              <View key={badge.milestone} style={styles.gridItem}>
                <BadgeTile badge={badge} />
              </View>
            ))}
            {badges.next ? (
              <View style={styles.gridItem}>
                <BadgeTile badge={badges.next} />
              </View>
            ) : null}
          </View>
        )}
      </View>

      {isAdmin.data ? (
        <Card onPress={() => router.push('/admin')} style={styles.adminCard}>
          <ThemedText type="bold">review organizations</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {pendingCount === 0
              ? 'nothing waiting for approval'
              : `${pendingCount} waiting for approval`}
          </ThemedText>
        </Card>
      ) : null}

      <Card style={styles.setting}>
        <View style={styles.settingText}>
          <ThemedText type="bold">show my total to followers</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile.data?.hide_from_leaderboard
              ? 'hidden: people who follow you won’t see your monthly total. you still see it.'
              : 'people who follow you see how many items you gave this month.'}
          </ThemedText>
          {setHidden.error ? <ErrorText>{errorMessage(setHidden.error)}</ErrorText> : null}
        </View>
        <Switch
          accessibilityLabel="show my monthly total to followers"
          value={!profile.data?.hide_from_leaderboard}
          disabled={setHidden.isPending || !profile.data}
          onValueChange={(show) => setHidden.mutate(!show)}
          trackColor={{ true: theme.tint, false: theme.backgroundSelected }}
        />
      </Card>

      <Button variant="secondary" label="sign out" onPress={() => supabase.auth.signOut()} />

      <View style={styles.footer}>
        <LegalLinks />
        {deleteAccount.error ? <ErrorText>{errorMessage(deleteAccount.error)}</ErrorText> : null}
        <Button
          variant="danger"
          label="delete account"
          loading={deleteAccount.isPending}
          onPress={confirmDeleteAccount}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  start: { alignSelf: 'flex-start', marginTop: Spacing.one },
  next: { gap: Spacing.two },
  adminCard: { gap: Spacing.half },
  setting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  settingText: { flex: 1, gap: Spacing.half },
  footer: { gap: Spacing.three, marginTop: Spacing.four },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridItem: { width: '31%' },
});
