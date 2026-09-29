import type { NearbyNeed } from '@/api/needs';
import { lower } from '@/lib/format';

export type OrganizationPin = { id: string; name: string; latitude: number; longitude: number; count: number };

/** One pin per organization, with how many open needs it has. */
export function organizationPins(needs: NearbyNeed[]): OrganizationPin[] {
  const byId = new Map<string, OrganizationPin>();
  for (const need of needs) {
    const existing = byId.get(need.organization_id);
    if (existing) existing.count += 1;
    else
      byId.set(need.organization_id, {
        id: need.organization_id,
        name: lower(need.organization_name),
        latitude: need.org_lat,
        longitude: need.org_lng,
        count: 1,
      });
  }
  return [...byId.values()];
}
