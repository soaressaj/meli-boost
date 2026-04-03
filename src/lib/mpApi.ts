import { supabase } from "@/integrations/supabase/client";

export const mpApi = {
  async getAccessToken(userId: string): Promise<string | null> {
    // Always get tokens server-side via edge function to avoid exposing them to the client
    const { data, error } = await supabase.functions.invoke('refresh-token', {
      body: {},
    });
    if (error || !data?.access_token) return null;
    return data.access_token;
  },

  async fetchPayments(
    accessToken: string,
    beginDate: string,
    endDate: string,
    offset = 0,
    limit = 50
  ) {
    const params = new URLSearchParams({
      sort: 'date_approved',
      criteria: 'desc',
      range: 'date_approved',
      begin_date: `${beginDate}T00:00:00.000-03:00`,
      end_date: `${endDate}T23:59:59.999-03:00`,
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/search?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) throw new Error(`MP API error: ${response.status}`);
    return response.json();
  },

  async fetchAllPayments(
    accessToken: string,
    beginDate: string,
    endDate: string
  ) {
    const allResults: any[] = [];
    let offset = 0;
    const limit = 50;
    let total = Infinity;

    while (offset < total && offset < 5000) {
      const data = await mpApi.fetchPayments(accessToken, beginDate, endDate, offset, limit);
      total = data.paging.total;

      const filtered = data.results.filter(
        (p: any) =>
          p.order?.id &&
          p.operation_type === 'regular_payment' &&
          p.status === 'approved'
      );

      allResults.push(...filtered);
      offset += limit;

      // Rate limiting: 1 req/sec
      if (offset < total) await new Promise((r) => setTimeout(r, 1000));
    }

    return allResults;
  },
};
