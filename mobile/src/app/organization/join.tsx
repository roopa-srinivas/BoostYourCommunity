import { router } from 'expo-router';
import { useState } from 'react';

import { useJoinOrganization } from '@/api/team';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/format';

/** Join an organization as staff with an invite code from its owner. */
export default function JoinOrganizationScreen() {
  const join = useJoinOrganization();
  const [code, setCode] = useState('');

  async function submit() {
    if (code.replace(/[\s-]/g, '').length !== 6) return;
    try {
      await join.mutateAsync(code.replace(/-/g, ''));
      router.replace('/organization');
    } catch {
      // Shown below from join.error.
    }
  }

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary">
        ask your organization’s owner for an invite code. they can make one under organization → team.
      </ThemedText>
      <TextField
        label="invite code"
        value={code}
        onChangeText={setCode}
        placeholder="6 letters and numbers"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        maxLength={9}
        onSubmitEditing={submit}
      />
      {join.error ? <ErrorText>{errorMessage(join.error)}</ErrorText> : null}
      <Button
        label="join"
        onPress={submit}
        loading={join.isPending}
        disabled={code.replace(/[\s-]/g, '').length !== 6}
      />
    </Screen>
  );
}
