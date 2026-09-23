import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cancelDropoffReminder } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/auth-provider';

// Pledges change need totals, so every pledge mutation refreshes both.
function useInvalidatePledgesAndNeeds() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pledges'] }),
      queryClient.invalidateQueries({ queryKey: ['needs'] }),
    ]);
}

export function useMyPledges() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['pledges', 'mine', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pledges')
        .select(
          'id, quantity, status, created_at, resolved_at, checkin_code, need:needs(id, title, unit, dropoff_starts_at, dropoff_ends_at, organization:organizations(name, address))',
        )
        .eq('donor_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export type MyPledge = NonNullable<ReturnType<typeof useMyPledges>['data']>[number];

/** Pledges on one need, with donor names. Only the organization's staff can see these. */
export function useNeedPledges(needId: string | undefined) {
  return useQuery({
    queryKey: ['pledges', 'need', needId],
    enabled: !!needId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pledges')
        .select('id, quantity, status, created_at, checkin_code, donor_id, donor:profiles!pledges_donor_id_fkey(display_name)')
        .eq('need_id', needId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePledge() {
  const invalidate = useInvalidatePledgesAndNeeds();
  return useMutation({
    /** Returns the new pledge's id and check-in code. */
    mutationFn: async ({ needId, quantity }: { needId: string; quantity: number }) => {
      const { data, error } = await supabase
        .from('pledges')
        .insert({ need_id: needId, quantity })
        .select('id, checkin_code')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelPledge() {
  const invalidate = useInvalidatePledgesAndNeeds();
  return useMutation({
    mutationFn: async (pledgeId: string) => {
      const { error } = await supabase.rpc('cancel_pledge', { pledge_id: pledgeId });
      if (error) throw error;
      await cancelDropoffReminder(pledgeId);
    },
    onSuccess: invalidate,
  });
}

export function useResolvePledge() {
  const invalidate = useInvalidatePledgesAndNeeds();
  return useMutation({
    mutationFn: async ({ pledgeId, outcome }: { pledgeId: string; outcome: 'received' | 'no_show' }) => {
      const { error } = await supabase.rpc('resolve_pledge', { pledge_id: pledgeId, outcome });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * The pledge with this check-in code, for staff at drop-off: only pledges to
 * organizations where the signed-in user is staff. (Row level security also
 * lets donors see their own pledges; those must not show up here, or staff
 * could "find" a pledge they can't confirm.) Codes are only unique among
 * pending pledges, so prefer a pending one.
 */
export function usePledgeByCode(code: string | null) {
  const userId = useUserId();
  return useQuery({
    queryKey: ['pledges', 'code', code, userId],
    enabled: !!code && !!userId,
    queryFn: async () => {
      const memberships = await supabase.from('organization_members').select('organization_id').eq('user_id', userId);
      if (memberships.error) throw memberships.error;
      const staffOf = memberships.data.map((m) => m.organization_id);
      if (staffOf.length === 0) return null;

      const { data, error } = await supabase
        .from('pledges')
        .select(
          'id, quantity, status, checkin_code, created_at, donor:profiles!pledges_donor_id_fkey(display_name), need:needs!inner(id, title, unit, organization_id, dropoff_starts_at, dropoff_ends_at, organization:organizations(id, name))',
        )
        .eq('checkin_code', code!)
        .in('need.organization_id', staffOf)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const atMyOrganizations = data.filter((p) => p.need !== null);
      return atMyOrganizations.find((p) => p.status === 'pledged') ?? atMyOrganizations[0] ?? null;
    },
  });
}
