import type { DailyHealthSummary, HealthPlatform } from '@/stores/useHealthIntegrationStore';

declare global {
  interface Window {
    FitFlowHealth?: {
      isAvailable: (platform: HealthPlatform) => Promise<boolean> | boolean;
      requestPermissions: (platform: HealthPlatform) => Promise<boolean>;
      getDailySummary: (date: string, platform: HealthPlatform) => Promise<DailyHealthSummary>;
    };
  }
}

export async function isNativeHealthAvailable(platform: HealthPlatform) {
  if (platform === 'none' || platform === 'manual') return false;
  return Boolean(await window.FitFlowHealth?.isAvailable(platform));
}

export async function syncNativeHealth(platform: HealthPlatform) {
  if (!window.FitFlowHealth) {
    throw new Error('Integração nativa indisponível neste navegador.');
  }

  const available = await window.FitFlowHealth.isAvailable(platform);
  if (!available) throw new Error('Fonte de saúde indisponível neste dispositivo.');

  const granted = await window.FitFlowHealth.requestPermissions(platform);
  if (!granted) throw new Error('Permissão negada.');

  const date = new Date().toISOString().slice(0, 10);
  return window.FitFlowHealth.getDailySummary(date, platform);
}
