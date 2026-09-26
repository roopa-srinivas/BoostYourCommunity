import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TablesInsert, TablesUpdate } from '@/lib/database.types';
import type { NeedCategory, NeedStatus } from '@/lib/labels';
import { supabase } from '@/lib/supabase';

// Every query about needs is keyed under 'needs' so one invalidation refreshes
// them all after a pledge or edit changes the numbers.

export type Coordinates = { latitude: number; longitude: number };

export const NEARBY_RADIUS_METERS = 20_000;

export function useNearbyNeeds(
  location: Coordinates | null,
  category: NeedCategory | null,
  radiusMeters: number = NEARBY_RADIUS_METERS,
) {
  return useQuery({
    queryKey: ['needs', 'nearby', location?.latitude, location?.longitude, category, radiusMeters],
    enabled: !!location,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('needs_near', {
        lat: location!.latitude,
        lng: location!.longitude,
        radius_m: radiusMeters,
        only_category: category ?? undefined,
      });
      if (error) throw error;
      return data;
    },
  });
}

export type NearbyNeed = NonNullable<ReturnType<typeof useNearbyNeeds>['data']>[number];

export function useNeed(needId: string | undefined) {
  return useQuery({
    queryKey: ['needs', 'detail', needId],
    enabled: !!needId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('needs')
        .select('*, organization:organizations(id, name, address, phone, website)')
        .eq('id', needId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useOrganizationNeeds(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['needs', 'organization', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('needs')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('dropoff_ends_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type NeedFields = Pick<
  TablesInsert<'needs'>,
  | 'category'
  | 'title'
  | 'details'
  | 'quantity_needed'
  | 'unit'
  | 'dropoff_starts_at'
  | 'dropoff_ends_at'
  | 'repeat_unit'
  | 'repeat_interval'
  | 'repeat_weekdays'
  | 'repeat_month_mode'
  | 'repeat_ends_after'
  | 'repeat_until'
>;

/** Creates a need when `needId` is missing, otherwise updates it. Returns the need's id. */
export function useSaveNeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      needId,
      organizationId,
      fields,
    }: {
      needId?: string;
      organizationId: string;
      fields: NeedFields;
    }) => {
      if (needId) {
        const update: TablesUpdate<'needs'> = fields;
        const { error } = await supabase.from('needs').update(update).eq('id', needId);
        if (error) throw error;
        return needId;
      }
      const { data, error } = await supabase
        .from('needs')
        .insert({ ...fields, organization_id: organizationId })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['needs'] }),
  });
}

export function useSetNeedStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ needId, status }: { needId: string; status: NeedStatus }) => {
      const { error } = await supabase.from('needs').update({ status }).eq('id', needId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['needs'] }),
  });
}

/** Stop a weekly need from being posted again (the current week stays). */
export function useStopRepeating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (needId: string) => {
      const { error } = await supabase.rpc('stop_repeating', { need_id: needId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['needs'] }),
  });
}

/**
 * Open needs from the organizations I follow, closing soonest first, wherever
 * they are (not limited to the nearby radius). Same shape as nearby needs, with
 * the distance when it's known.
 */
export function useFollowedNeeds(organizationIds: Set<string> | undefined, category: NeedCategory | null) {
  const ids = [...(organizationIds ?? [])].sort();
  return useQuery({
    queryKey: ['needs', 'followed', ids, category],
    enabled: ids.length > 0,
    queryFn: async () => {
      let query = supabase
        .from('needs')
        .select(
          'id, organization_id, category, title, details, unit, quantity_needed, quantity_committed, dropoff_starts_at, dropoff_ends_at, organization:organizations!inner(name, address, status)',
        )
        .in('organization_id', ids)
        .eq('status', 'open')
        .eq('organization.status', 'approved')
        .gt('dropoff_ends_at', new Date().toISOString())
        .order('dropoff_ends_at', { ascending: true });
      if (category) query = query.eq('category', category);
      const { data, error } = await query;
      if (error) throw error;
      return data
        .filter((n) => n.quantity_committed < n.quantity_needed)
        .map((n) => ({
          need_id: n.id,
          organization_id: n.organization_id,
          organization_name: n.organization.name,
          address: n.organization.address,
          category: n.category,
          title: n.title,
          details: n.details ?? '',
          unit: n.unit,
          quantity_needed: n.quantity_needed,
          quantity_remaining: n.quantity_needed - n.quantity_committed,
          dropoff_starts_at: n.dropoff_starts_at,
          dropoff_ends_at: n.dropoff_ends_at,
        }));
    },
  });
}

export type FollowedNeed = NonNullable<ReturnType<typeof useFollowedNeeds>['data']>[number];
