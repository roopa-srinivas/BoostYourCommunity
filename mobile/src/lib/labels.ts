import type { BadgeTone } from '@/components/ui/badge';
import type { Enums } from './database.types';

export type NeedCategory = Enums<'need_category'>;
export type NeedStatus = Enums<'need_status'>;
export type PledgeStatus = Enums<'pledge_status'>;
export type OrganizationKind = Enums<'organization_kind'>;
export type OrganizationStatus = Enums<'organization_status'>;

export const CATEGORIES: readonly { value: NeedCategory; label: string }[] = [
  { value: 'food', label: 'food' },
  { value: 'water', label: 'water' },
  { value: 'clothing', label: 'clothing' },
  { value: 'hygiene', label: 'hygiene' },
  { value: 'other', label: 'other' },
];

export const ORGANIZATION_KINDS: readonly { value: OrganizationKind; label: string }[] = [
  { value: 'shelter', label: 'shelter' },
  { value: 'food_pantry', label: 'food pantry' },
  { value: 'community_fridge', label: 'community fridge' },
  { value: 'other', label: 'other' },
];

export function categoryLabel(category: NeedCategory) {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export const PLEDGE_STATUS: Record<PledgeStatus, { label: string; tone: BadgeTone }> = {
  pledged: { label: 'pledged', tone: 'info' },
  received: { label: 'received', tone: 'success' },
  no_show: { label: 'not dropped off', tone: 'warning' },
  cancelled: { label: 'cancelled', tone: 'neutral' },
};

export const NEED_STATUS: Record<NeedStatus, { label: string; tone: BadgeTone }> = {
  open: { label: 'open', tone: 'info' },
  closed: { label: 'closed', tone: 'neutral' },
  cancelled: { label: 'cancelled', tone: 'neutral' },
};

export const ORGANIZATION_STATUS: Record<OrganizationStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'waiting for approval', tone: 'warning' },
  approved: { label: 'approved', tone: 'success' },
  suspended: { label: 'suspended', tone: 'danger' },
};
