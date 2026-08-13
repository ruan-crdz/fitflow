import { supabase } from '@/lib/supabase';
import { applyBackupStorageSnapshot, createBackupStorageSnapshot } from '@/utils/backup';
import { clearGymPilotLocalData } from '@/utils/resetAppData';

interface CloudSnapshotRow {
  user_id: string;
  payload: Record<string, string>;
  updated_at: string;
}

function toStoragePayload(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};

  const result: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    if (typeof item === 'string') result[key] = item;
  });
  return result;
}

export async function replaceLocalStateFromCloud(userId: string): Promise<{ hasSnapshot: boolean }> {
  if (!supabase) throw new Error('Supabase indisponível.');

  const { data, error } = await supabase
    .from('user_app_snapshots')
    .select('user_id, payload, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const snapshot = data as CloudSnapshotRow | null;
  const payload = toStoragePayload(snapshot?.payload);

  // Keep auth session alive while replacing only app-local state.
  clearGymPilotLocalData({ preserveSupabaseSession: true });
  applyBackupStorageSnapshot(payload);

  return { hasSnapshot: Object.keys(payload).length > 0 };
}

export async function pushLocalStateToCloud(userId: string, overrides?: Record<string, string>): Promise<void> {
  if (!supabase) return;

  const payload = {
    ...createBackupStorageSnapshot(),
    ...(overrides || {}),
  };
  const { error } = await supabase.from('user_app_snapshots').upsert({
    user_id: userId,
    payload,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}
