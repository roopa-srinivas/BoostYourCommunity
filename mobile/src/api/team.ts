import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

/** Everyone on an organization's team, owners first. Members only. */
export function useOrganizationTeam(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', 'team', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('user_id, role, created_at, member:profiles!organization_members_user_id_fkey(display_name)')
        .eq('organization_id', organizationId!)
        .order('role', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

/** Owners create a one-time invite code (valid 7 days). Returns the code. */
export function useCreateInvite() {
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase.rpc('create_staff_invite', { organization_id: organizationId });
      if (error) throw error;
      return data;
    },
  });
}

/** Join an organization as staff with an invite code. Returns its id. */
export function useJoinOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('join_organization', { invite_code: code });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}

/** Owners remove a staff member, or staff leave (pass their own id). */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ organizationId, userId }: { organizationId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .select('user_id');
      if (error) throw error;
      // Row level security turns a forbidden delete into "no rows".
      if (data.length === 0) throw new Error('only owners can remove staff, and owners can’t be removed.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}
