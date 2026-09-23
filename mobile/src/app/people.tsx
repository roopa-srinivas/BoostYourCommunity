import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useFollowingIds, usePeopleSearch, useSetFollowing } from '@/api/community';
import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorText, Loading } from '@/components/ui/message';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { errorMessage } from '@/lib/format';
import { supabase } from '@/lib/supabase';

type Person = { id: string; display_name: string };

/** Everyone I follow, for when the search box is empty. */
function useFollowingPeople(ids: Set<string> | undefined) {
  const list = ids ? [...ids].sort() : [];
  return useQuery({
    queryKey: ['follows', 'people', list],
    enabled: list.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', list).order('display_name');
      if (error) throw error;
      return data;
    },
  });
}

export default function PeopleScreen() {
  const [search, setSearch] = useState('');
  const following = useFollowingIds();
  const results = usePeopleSearch(search);
  const followingPeople = useFollowingPeople(following.data);
  const setFollowing = useSetFollowing();

  const searching = search.trim().length >= 2;
  const people: Person[] = (searching ? results.data : followingPeople.data) ?? [];
  const loading = searching ? results.isPending : following.isPending || (following.data?.size ?? 0) > 0 && followingPeople.isPending;
  const error = results.error ?? following.error ?? followingPeople.error ?? setFollowing.error;

  return (
    <Screen>
      <TextField
        label="search by name"
        value={search}
        onChangeText={setSearch}
        placeholder="at least 2 letters"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />
      {error ? <ErrorText>{errorMessage(error)}</ErrorText> : null}

      <ThemedText type="sectionTitle">{searching ? 'people' : 'people you follow'}</ThemedText>
      {loading ? (
        <Loading />
      ) : people.length === 0 ? (
        <EmptyState
          title={searching ? 'no one by that name' : 'you’re not following anyone yet'}
          body={searching ? 'check the spelling, or ask your friend what name they signed up with.' : 'search for friends above.'}
        />
      ) : (
        <Card style={styles.list}>
          {people.map((person) => {
            const isFollowing = following.data?.has(person.id) ?? false;
            const busy = setFollowing.isPending && setFollowing.variables?.personId === person.id;
            return (
              <View key={person.id} style={styles.row}>
                <Avatar name={person.display_name} size={40} />
                <ThemedText style={styles.name} numberOfLines={1}>
                  {person.display_name}
                </ThemedText>
                <Button
                  variant={isFollowing ? 'secondary' : 'primary'}
                  label={isFollowing ? 'following' : 'follow'}
                  loading={busy}
                  style={styles.button}
                  accessibilityLabel={isFollowing ? `unfollow ${person.display_name}` : `follow ${person.display_name}`}
                  onPress={() => setFollowing.mutate({ personId: person.id, follow: !isFollowing })}
                />
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  name: { flex: 1 },
  button: { minHeight: 40, paddingHorizontal: Spacing.three },
});
