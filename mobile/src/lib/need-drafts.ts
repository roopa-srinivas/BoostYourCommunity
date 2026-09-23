import type { NeedCategory } from '@/lib/labels';
import { presetRule, type RepeatPreset, type RepeatRule } from '@/lib/repeat';

/**
 * Unfinished "post a need" forms, kept on this device per organization.
 * localStorage is the browser's on web and SQLite-backed on phones.
 */
export type NeedDraft = {
  id: string;
  updatedAt: string;
  /** The past need this started from, if any (for the "post again" note). */
  copiedFrom: string | null;
  fields: {
    category: NeedCategory;
    title: string;
    details: string;
    quantity: string;
    unit: string;
    startsAt: string;
    endsAt: string;
    repeat: RepeatRule | null;
  };
};

const MAX_DRAFTS = 10;
const key = (organizationId: string) => `need-drafts:${organizationId}`;

export function listDrafts(organizationId: string): NeedDraft[] {
  try {
    const raw = localStorage.getItem(key(organizationId));
    const drafts = (raw ? (JSON.parse(raw) as NeedDraft[]) : []).map(upgrade);
    return drafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

/**
 * Older drafts stored a weekly on/off flag, then one of a few fixed
 * frequencies ('daily', 'weekly', 'biweekly', 'monthly'); turn both into rules.
 */
function upgrade(draft: NeedDraft): NeedDraft {
  const fields = draft.fields as Omit<NeedDraft['fields'], 'repeat'> & {
    repeat?: RepeatRule | string | null;
    repeatsWeekly?: boolean;
  };
  const { repeatsWeekly, repeat, ...rest } = fields;
  if (repeat !== undefined && (repeat === null || typeof repeat === 'object')) {
    return { ...draft, fields: { ...rest, repeat } };
  }
  const legacy = typeof repeat === 'string' ? repeat : repeatsWeekly ? 'weekly' : 'none';
  return { ...draft, fields: { ...rest, repeat: presetRule(legacy as RepeatPreset) } };
}

export function getDraft(organizationId: string, draftId: string) {
  return listDrafts(organizationId).find((d) => d.id === draftId) ?? null;
}

export function saveDraft(organizationId: string, draft: NeedDraft) {
  const others = listDrafts(organizationId).filter((d) => d.id !== draft.id);
  // Newest first; drop the oldest past the limit.
  const drafts = [draft, ...others].slice(0, MAX_DRAFTS);
  localStorage.setItem(key(organizationId), JSON.stringify(drafts));
}

export function deleteDraft(organizationId: string, draftId: string) {
  const drafts = listDrafts(organizationId).filter((d) => d.id !== draftId);
  localStorage.setItem(key(organizationId), JSON.stringify(drafts));
}

export function newDraftId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
