
-- Conexões ML por usuário
CREATE TABLE public.mp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mp_user_id BIGINT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Configurações por usuário
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  antecipacao_ativa BOOLEAN DEFAULT FALSE,
  taxa_antecipacao NUMERIC(5,4) DEFAULT 0.038,
  custo_fixo_mensal NUMERIC(10,2) DEFAULT 0,
  custo_frete_por_pedido NUMERIC(10,2) DEFAULT 0,
  custo_produto_percentual NUMERIC(5,2) DEFAULT 0,
  aliquota_imposto NUMERIC(5,2) DEFAULT 0,
  investimento_ads_periodo NUMERIC(10,2) DEFAULT 0,
  ads_ignorado BOOLEAN DEFAULT FALSE,
  regime_tributario TEXT DEFAULT 'simples',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.mp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_connections_select" ON public.mp_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_connections_insert" ON public.mp_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_own_connections_update" ON public.mp_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_own_connections_delete" ON public.mp_connections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "users_own_settings_select" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_own_settings_insert" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_own_settings_update" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_own_settings_delete" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);
