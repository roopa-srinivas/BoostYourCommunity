import type { Coordinates, NearbyNeed } from '@/api/needs';

type NeedsMapProps = {
  center: Coordinates;
  needs: NearbyNeed[];
  selectedOrganizationId: string | null;
  onSelectOrganization: (organizationId: string | null) => void;
};

/** react-native-maps doesn't support web, so the web app shows the list only. */
export function NeedsMap(_props: NeedsMapProps) {
  return null;
}
