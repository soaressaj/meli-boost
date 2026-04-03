
-- Create payments table for webhook data
CREATE TABLE public.mp_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mp_payment_id bigint NOT NULL,
  status text NOT NULL,
  status_detail text,
  transaction_amount numeric NOT NULL DEFAULT 0,
  currency_id text DEFAULT 'BRL',
  fee_amount numeric DEFAULT 0,
  net_received_amount numeric DEFAULT 0,
  date_approved timestamptz,
  date_created timestamptz,
  description text,
  payer_email text,
  order_id bigint,
  operation_type text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(mp_payment_id)
);

-- Enable RLS
ALTER TABLE public.mp_payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payments
CREATE POLICY "users_own_payments_select" ON public.mp_payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts via webhook (no user policy needed for INSERT since webhook uses service role)

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_payments;
