import type { BadgeTone } from '@/components/ui/badge';
import type { Enums } from './database.types';

export type NeedCategory = Enums<'need_category'>;
export type NeedStatus = Enums<'need_status'>;
export type PledgeStatus = Enums<'pledge_status'>;
export type OrganizationKind = Enums<'organization_kind'>;
export type OrganizationStatus = Enums<'organization_status'>;

export const CATEGORIES: readonly { value: NeedCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'water', label: 'Water' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'hygiene', label: 'Hygiene' },
  { value: 'other', label: 'Other' },
];

export const ORGANIZATION_KINDS: readonly { value: OrganizationKind; label: string }[] = [
  { value: 'shelter', label: 'Shelter' },
  { value: 'food_pantry', label: 'Food pantry' },
  { value: 'community_fridge', label: 'Community fridge' },
  { value: 'other', label: 'Other' },
];

export function categoryLabel(category: NeedCategory) {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export const PLEDGE_STATUS: Record<PledgeStatus, { label: string; tone: BadgeTone }> = {
  pledged: { label: 'Pledged', tone: 'info' },
  received: { label: 'Received', tone: 'success' },
  no_show: { label: 'Not dropped off', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const NEED_STATUS: Record<NeedStatus, { label: string; tone: BadgeTone }> = {
  open: { label: 'Open', tone: 'info' },
  closed: { label: 'Closed', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const ORGANIZATION_STATUS: Record<OrganizationStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Waiting for approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'danger' },
};
