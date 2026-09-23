import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Coordinates } from '@/api/needs';
import type { OrganizationKind } from '@/lib/labels';
import { supabase } from '@/lib/supabase';
import { useUserId } from '@/providers/auth-provider';

/** Organizations the signed-in user belongs to, with their role. */
export function useMyOrganizations() {
  const userId = useUserId();
  return useQuery({
    queryKey: ['organizations', 'mine', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, organization:organizations(id, name, kind, status, address)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export type OrganizationFields = {
  name: string;
  kind: OrganizationKind;
  description: string | null;
  address: string;
  phone: string | null;
  website: string | null;
  location: Coordinates;
};

export function useRegisterOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ location, ...fields }: OrganizationFields) => {
      const { error } = await supabase.from('organizations').insert({
        ...fields,
        // PostGIS reads well-known text: longitude first.
        location: `POINT(${location.longitude} ${location.latitude})`,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}
