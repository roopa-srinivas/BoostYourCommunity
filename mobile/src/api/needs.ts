import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TablesInsert, TablesUpdate } from '@/lib/database.types';
import type { NeedCategory, NeedStatus } from '@/lib/labels';
import { supabase } from '@/lib/supabase';

// Every query about needs is keyed under 'needs' so one invalidation refreshes
// them all after a pledge or edit changes the numbers.

export type Coordinates = { latitude: number; longitude: number };

export const NEARBY_RADIUS_METERS = 20_000;

export function useNearbyNeeds(location: Coordinates | null, category: NeedCategory | null) {
  return useQuery({
    queryKey: ['needs', 'nearby', location?.latitude, location?.longitude, category],
    enabled: !!location,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('needs_near', {
        lat: location!.latitude,
        lng: location!.longitude,
        radius_m: NEARBY_RADIUS_METERS,
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
  | 'repeat_frequency'
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
