
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.listing_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ml_item_id TEXT NOT NULL,
  title TEXT,
  thumbnail TEXT,
  price NUMERIC DEFAULT 0,
  custo_produto NUMERIC DEFAULT 0,
  is_kit BOOLEAN DEFAULT false,
  qtd_kit INTEGER DEFAULT 1,
  bonus_campanha NUMERIC DEFAULT 0,
  taxa_anuncio NUMERIC DEFAULT 0.14,
  diferenca_icms NUMERIC DEFAULT 0,
  icms_estado NUMERIC DEFAULT 0.04,
  faixa_peso TEXT DEFAULT '0-300',
  is_full BOOLEAN DEFAULT true,
  is_alimento_animal BOOLEAN DEFAULT false,
  margem_desejada NUMERIC DEFAULT 0.15,
  embalagem NUMERIC DEFAULT 0,
  transporte NUMERIC DEFAULT 0,
  etiqueta NUMERIC DEFAULT 0,
  bonus_afiliados NUMERIC DEFAULT 0,
  frete_manual NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ml_item_id)
);

ALTER TABLE public.listing_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own listing pricing" ON public.listing_pricing FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own listing pricing" ON public.listing_pricing FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own listing pricing" ON public.listing_pricing FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own listing pricing" ON public.listing_pricing FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_listing_pricing_updated_at
BEFORE UPDATE ON public.listing_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
