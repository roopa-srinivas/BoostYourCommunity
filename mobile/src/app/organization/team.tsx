import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { useOrganization } from '@/api/organizations';
import { useCreateInvite, useOrganizationTeam, useRemoveMember } from '@/api/team';
import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCheckinCode } from '@/lib/checkin';
import { confirm } from '@/lib/confirm';
import { errorMessage, lower } from '@/lib/format';
import { goBackOr } from '@/lib/navigation';
import { useUserId } from '@/providers/auth-provider';

const INVITE_DAYS = 7;

/** An organization's team: owners invite and remove staff; staff can leave. */
export default function TeamScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const userId = useUserId();
  const theme = useTheme();
  const organization = useOrganization(organizationId);
  const team = useOrganizationTeam(organizationId);
  const createInvite = useCreateInvite();
  const remove = useRemoveMember();
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  if (team.isPending || organization.isPending) return <Loading />;

  const members = team.data ?? [];
  const me = members.find((m) => m.user_id === userId);
  const isOwner = me?.role === 'owner';
  const orgName = lower(organization.data?.name);

  async function invite() {
    try {
      setInviteCode(await createInvite.mutateAsync(organizationId));
    } catch {
      // Shown below from createInvite.error.
    }
  }

  function shareInvite(code: string) {
    Share.share({
      message: `join ${orgName} on boost your community: open the app, go to organization → join with an invite code, and enter ${formatCheckinCode(code)}. the code works once and expires in ${INVITE_DAYS} days.`,
    });
  }

  async function removeMember(memberId: string, name: string) {
    const ok = await confirm(
      `remove ${name}?`,
      `they’ll no longer be able to post needs or check in drop-offs for ${orgName}.`,
      'remove',
    );
    if (ok) remove.mutate({ organizationId, userId: memberId });
  }

  async function leave() {
    const ok = await confirm(
      `leave ${orgName}?`,
      'you’ll need a new invite code to join again.',
      'leave',
    );
    if (!ok) return;
    try {
      await remove.mutateAsync({ organizationId, userId });
      goBackOr('/organization');
    } catch {
      // Shown below from remove.error.
    }
  }

  return (
    <Screen onRefresh={team.refetch}>
      <ThemedText type="sectionTitle">{orgName}</ThemedText>
      {team.error ? <ErrorText>{errorMessage(team.error)}</ErrorText> : null}
      {remove.error ? <ErrorText>{errorMessage(remove.error)}</ErrorText> : null}

      <Card style={styles.list}>
        {members.map((member) => {
          const name = member.member?.display_name ?? 'a teammate';
          const isMe = member.user_id === userId;
          return (
            <View key={member.user_id} style={styles.row}>
              <Avatar name={name} size={40} />
              <View style={styles.flex}>
                <ThemedText type={isMe ? 'bold' : 'default'} numberOfLines={1}>
                  {isMe ? `${name} (you)` : name}
                </ThemedText>
                <Badge label={member.role} tone={member.role === 'owner' ? 'accent' : 'neutral'} />
              </View>
              {isOwner && member.role === 'staff' ? (
                <ThemedText
                  type="link"
                  themeColor="danger"
                  accessibilityRole="button"
                  accessibilityLabel={`remove ${name}`}
                  onPress={() => removeMember(member.user_id, name)}>
                  remove
                </ThemedText>
              ) : null}
            </View>
          );
        })}
      </Card>

      {isOwner ? (
        <View style={styles.section}>
          <ThemedText type="sectionTitle">invite staff</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            staff can post needs and check in drop-offs. each code works once and expires in {INVITE_DAYS} days, so
            nobody joins without you sharing it with them.
          </ThemedText>
          {inviteCode ? (
            <View style={[styles.code, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary">
                invite code
              </ThemedText>
              <ThemedText type="title" style={styles.codeText} accessibilityLabel={inviteCode.split('').join(' ')}>
                {formatCheckinCode(inviteCode)}
              </ThemedText>
              <Button label="share" onPress={() => shareInvite(inviteCode)} style={styles.stretch} />
            </View>
          ) : null}
          {createInvite.error ? <ErrorText>{errorMessage(createInvite.error)}</ErrorText> : null}
          <Button
            variant={inviteCode ? 'secondary' : 'primary'}
            label={inviteCode ? 'make another code' : 'create an invite code'}
            onPress={invite}
            loading={createInvite.isPending}
          />
        </View>
      ) : me ? (
        <Button variant="danger" label="leave this organization" onPress={leave} loading={remove.isPending} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.half },
  section: { gap: Spacing.two, marginTop: Spacing.two },
  code: { alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card },
  codeText: { letterSpacing: 4 },
  stretch: { alignSelf: 'stretch' },
});
