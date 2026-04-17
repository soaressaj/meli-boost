export interface MPPayment {
  id: number;
  date_created: string;
  date_approved: string;
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded' | 'in_process';
  status_detail: string;
  operation_type: string;
  transaction_amount: number;
  currency_id: string;
  order?: { id: number; type: string };
  fee_details: Array<{ type: string; amount: number; fee_payer: string }>;
  transaction_details?: {
    net_received_amount: number;
    total_paid_amount: number;
    installment_amount: number;
    overpaid_amount: number;
  };
  payer: { id: number; email: string };
  description?: string;
  money_release_status?: string;
  additional_info?: {
    items?: Array<{ id?: string; title?: string; quantity?: string | number; unit_price?: string | number; category_id?: string }>;
  };
}

export interface MPSearchResponse {
  paging: { total: number; limit: number; offset: number };
  results: MPPayment[];
}

export interface MPConnection {
  id: string;
  user_id: string;
  mp_user_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  nickname: string | null;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  antecipacao_ativa: boolean;
  taxa_antecipacao: number;
  custo_fixo_mensal: number;
  custo_frete_por_pedido: number;
  custo_produto_percentual: number;
  aliquota_imposto: number;
  investimento_ads_periodo: number;
  ads_ignorado: boolean;
  regime_tributario?: string;
  updated_at: string;
}

export type PeriodKey = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes_atual' | '1ano' | 'personalizado';

export interface DateRange {
  start: Date;
  end: Date;
}
