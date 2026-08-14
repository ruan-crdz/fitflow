# Billing Ultimate (Pix + Cartao) - Setup

Este app agora usa entitlement server-side para o plano Ultimate.

## Objetivo de seguranca

- O frontend nao decide mais sozinho se o usuario e Ultimate.
- O gateway de IA consulta assinatura no banco antes de liberar features premium.
- Alterar localStorage/localhost nao libera Ultimate no backend.

## Banco (SQL)

Rode `supabase/setup-all.sql` para criar:

- `public.user_ai_subscriptions`
- `public.billing_checkout_sessions`
- `public.app_admins`
- `public.get_my_ai_plan()`
- `public.set_user_ai_plan_manual(...)`

## Edge Functions novas

- `billing-create-checkout`: cria checkout Mercado Pago (Pix/cartao) para mensal ou anual.
- `billing-webhook`: recebe confirmacao de pagamento e ativa Ultimate.

## Secrets obrigatorios (Supabase)

Configure estes secrets no projeto:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `APP_BASE_URL` (ex.: `https://ruan-crdz.github.io/gympilot`)
- `BILLING_MONTHLY_BRL` (ex.: `19.9`)
- `BILLING_ANNUAL_BRL` (ex.: `199`)

## Deploy das functions

```bash
npx supabase functions deploy ai-gateway --project-ref pfogzrlnsfrpkyqnxpzy
npx supabase functions deploy billing-create-checkout --project-ref pfogzrlnsfrpkyqnxpzy
npx supabase functions deploy billing-webhook --project-ref pfogzrlnsfrpkyqnxpzy
```

## Config no Mercado Pago

No checkout preference, o webhook aponta para:

`https://<SEU_SUPABASE_URL>/functions/v1/billing-webhook`

A conta Mercado Pago precisa aceitar Pix/cartao no checkout.

## Como liberar Ultimate manualmente (ex.: sua esposa)

Opcao 1 (recomendada): colocar seu usuario em `app_admins` e usar RPC.

```sql
insert into public.app_admins (user_id) values ('SEU_USER_ID') on conflict do nothing;

select public.set_user_ai_plan_manual(
  p_target_user := 'USER_ID_DA_ESPOSA',
  p_plan := 'ultimate',
  p_days := 365,
  p_note := 'Premium manual por admin'
);
```

Opcao 2: inserir direto na tabela `user_ai_subscriptions` via SQL Editor.

## Observacoes

- O ciclo mensal/anual e configuravel por secret.
- O anual pode ter desconto comparado a 12x mensal.
- A cobranca aqui foi modelada como acesso por periodo (30/365 dias).
- Se quiser recorrencia automatica real, evoluir para assinatura nativa do provedor.
