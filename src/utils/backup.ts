import { getToday } from '@/utils/date';

export const BACKUP_KEYS = [
  'fitflow-profile',
  'fitflow-custom-workouts',
  'fitflow-history',
  'fitflow-session',
  'fitflow-weight',
  'fitflow-water',
  'fitflow-food',
  'fitflow-meals',
  'fitflow-notes',
  'fitflow-cycle',
  'fitflow-ai',
  'fitflow-dashboard',
  'fitflow-health-integration',
  'fitflow-theme',
  'fitflow-ai-config',
  'fitflow-accessibility',
];

interface BackupPayload {
  app: 'GymPilot';
  kind: 'gympilot-local-backup';
  version: 1;
  exportedAt: string;
  storage: Record<string, string>;
}

export function createBackupStorageSnapshot(): Record<string, string> {
  const storage: Record<string, string> = {};

  BACKUP_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) storage[key] = value;
  });

  return storage;
}

export function applyBackupStorageSnapshot(storage: Record<string, string>) {
  BACKUP_KEYS.forEach((key) => localStorage.removeItem(key));
  Object.entries(storage).forEach(([key, value]) => {
    if (BACKUP_KEYS.includes(key) && typeof value === 'string') {
      localStorage.setItem(key, value);
    }
  });
}

export function createBackupPayload(): BackupPayload {
  return {
    app: 'GymPilot',
    kind: 'gympilot-local-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    storage: createBackupStorageSnapshot(),
  };
}

export function downloadBackup() {
  const payload = createBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gympilot-backup-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreBackup(raw: string) {
  const parsed = JSON.parse(raw) as Partial<BackupPayload>;
  if (parsed.kind !== 'gympilot-local-backup' || !parsed.storage || typeof parsed.storage !== 'object') {
    throw new Error('Arquivo de backup inválido.');
  }

  applyBackupStorageSnapshot(parsed.storage as Record<string, string>);
}

export function readBackupFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsText(file);
  });
}
