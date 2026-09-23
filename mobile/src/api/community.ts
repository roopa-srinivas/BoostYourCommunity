import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NEARBY_RADIUS_METERS, type Coordinates } from '@/api/needs';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/auth-provider';

/** Confirmed items this month for me and the people I follow, most first. */
export function useLeaderboard() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['community', 'leaderboard', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('leaderboard_this_month');
      if (error) throw error;
      return data;
    },
  });
}

export const HEAT_WINDOW_DAYS = 30;

/** Confirmed items per organization near a point over the last 30 days. */
export function useCommunityHeat(location: Coordinates | null) {
  return useQuery({
    queryKey: ['community', 'heat', location?.latitude, location?.longitude],
    enabled: !!location,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_heat', {
        lat: location!.latitude,
        lng: location!.longitude,
        radius_m: NEARBY_RADIUS_METERS,
        days: HEAT_WINDOW_DAYS,
      });
      if (error) throw error;
      return data;
    },
  });
}

export type HeatSpot = NonNullable<ReturnType<typeof useCommunityHeat>['data']>[number];

/** How many people I follow and how many follow me. */
export function useFollowCounts() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['follows', 'counts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [following, followers] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', userId),
      ]);
      if (following.error) throw following.error;
      if (followers.error) throw followers.error;
      return { following: following.count ?? 0, followers: followers.count ?? 0 };
    },
  });
}

/** Ids of everyone I follow. */
export function useFollowingIds() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['follows', 'following', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', userId);
      if (error) throw error;
      return new Set(data.map((row) => row.followee_id));
    },
  });
}

/** People whose name contains `search`, excluding me. */
export function usePeopleSearch(search: string) {
  const userId = useUserId();
  const term = search.trim();
  return useQuery({
    queryKey: ['people', 'search', term],
    enabled: !!userId && term.length >= 2,
    queryFn: async () => {
      // Escape the characters ilike treats specially so they match literally.
      const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name')
        .ilike('display_name', pattern)
        .neq('id', userId)
        .order('display_name')
        .limit(25);
      if (error) throw error;
      return data;
    },
  });
}

export function useSetFollowing() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ personId, follow }: { personId: string; follow: boolean }) => {
      const { error } = follow
        ? await supabase.from('follows').insert({ followee_id: personId })
        : await supabase.from('follows').delete().eq('follower_id', userId).eq('followee_id', personId);
      if (error) throw error;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['follows'] }),
        queryClient.invalidateQueries({ queryKey: ['community', 'leaderboard'] }),
      ]),
  });
}
