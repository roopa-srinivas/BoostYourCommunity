import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useMyPledges } from '@/api/pledges';
import { useProfile, useUpdateDisplayName } from '@/api/profile';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const { session } = useAuth();
  const profile = useProfile();
  const pledges = useMyPledges();
  const updateName = useUpdateDisplayName();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  if (profile.isPending) return <Loading />;

  const all = pledges.data ?? [];
  // Only drop-offs the organization confirmed count toward stats.
  const receivedPledges = all.filter((p) => p.status === 'received');
  const itemsDonated = receivedPledges.reduce((sum, p) => sum + p.quantity, 0);
  const upcoming = all.filter((p) => p.status === 'pledged').length;

  async function saveName() {
    try {
      await updateName.mutateAsync(name.trim());
      setEditing(false);
    } catch {
      // Shown below from updateName.error.
    }
  }

  return (
    <Screen>
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
        <Stat value={receivedPledges.length} label={'drop-offs\nconfirmed'} />
        <Stat value={itemsDonated} label={'items\ndonated'} />
        <Stat value={upcoming} label={'upcoming\ndrop-offs'} />
      </View>

      <Button variant="secondary" label="sign out" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <ThemedText type="title">{value}</ThemedText>
      {/* Every label is two lines, centred, so the three boxes line up. */}
      <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel} numberOfLines={2}>
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  start: { alignSelf: 'flex-start', marginTop: Spacing.one },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.two, paddingVertical: Spacing.three },
  statLabel: { textAlign: 'center', fontSize: 13, lineHeight: 17 },
});
