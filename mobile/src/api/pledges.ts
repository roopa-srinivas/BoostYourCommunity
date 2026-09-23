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
 * The pledge with this check-in code, for staff at drop-off. Row level
 * security only returns pledges to the staff member's own organizations.
 * Codes are only unique among pending pledges, so prefer a pending one.
 */
export function usePledgeByCode(code: string | null) {
  return useQuery({
    queryKey: ['pledges', 'code', code],
    enabled: !!code,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pledges')
        .select(
          'id, quantity, status, checkin_code, created_at, donor:profiles!pledges_donor_id_fkey(display_name), need:needs(id, title, unit, dropoff_starts_at, dropoff_ends_at, organization:organizations(id, name))',
        )
        .eq('checkin_code', code!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.find((p) => p.status === 'pledged') ?? data[0] ?? null;
    },
  });
}
