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

/** An organization's public page: details and what it does and doesn't accept. */
export function useOrganization(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organizations', 'detail', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, kind, status, description, address, phone, website, hours, accepts, does_not_accept')
        .eq('id', organizationId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export type OrganizationPageFields = {
  description: string | null;
  hours: string | null;
  accepts: string | null;
  does_not_accept: string | null;
  phone: string | null;
  website: string | null;
};

/** Owners update what donors see on their organization's page. */
export function useUpdateOrganizationPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ organizationId, fields }: { organizationId: string; fields: OrganizationPageFields }) => {
      const { data, error } = await supabase.from('organizations').update(fields).eq('id', organizationId).select('id');
      if (error) throw error;
      // Row level security turns a forbidden update into "no rows", not an error.
      if (data.length === 0) throw new Error('only owners can edit this organization’s page.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
  });
}
