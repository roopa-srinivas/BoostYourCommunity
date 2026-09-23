import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrganizationStatus } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/auth-provider';

/** Whether the signed-in user can approve organizations. */
export function useIsAdmin() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['admin', 'is-admin', userId],
    enabled: !!userId,
    queryFn: async () => {
      // Row level security only lets people see their own admin row.
      const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

/** Organizations waiting for approval or suspended, newest first. Admins only. */
export function useOrganizationsToReview(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, kind, status, address, description, phone, website, created_at, creator:profiles!organizations_created_by_fkey(display_name)')
        .in('status', ['pending', 'suspended'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSetOrganizationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ organizationId, status }: { organizationId: string; status: OrganizationStatus }) => {
      const { error } = await supabase.rpc('set_organization_status', {
        organization_id: organizationId,
        new_status: status,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
        queryClient.invalidateQueries({ queryKey: ['needs'] }),
      ]),
  });
}
