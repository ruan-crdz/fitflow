import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/useProfileStore';
import type { AIPlan } from '@/types';

type BillingCycle = 'monthly' | 'annual';

type PlanPayload = {
  plan?: AIPlan;
  status?: string;
  billingCycle?: string;
  provider?: string;
  source?: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

export async function syncPlanFromBackend(): Promise<AIPlan> {
  if (!supabase) return 'free';

  const { data, error } = await supabase.rpc('get_my_ai_plan');
  if (error) throw error;

  const payload = (data || {}) as PlanPayload;
  const plan: AIPlan = payload.plan === 'ultimate' ? 'ultimate' : 'free';

  const updateProfile = useProfileStore.getState().updateProfile;
  updateProfile({ aiPlan: plan });

  return plan;
}

export async function createUltimateCheckout(cycle: BillingCycle): Promise<{ checkoutUrl: string }> {
  if (!supabase) throw new Error('Supabase indisponível.');

  const { data, error } = await supabase.functions.invoke('billing-create-checkout', {
    body: { cycle },
  });

  if (error) throw new Error(error.message || 'Falha ao criar checkout.');

  const payload = (data || {}) as { success?: boolean; checkoutUrl?: string; error?: { message?: string } };
  if (!payload.success || !payload.checkoutUrl) {
    throw new Error(payload.error?.message || 'Checkout não retornou URL válida.');
  }

  return { checkoutUrl: payload.checkoutUrl };
}
