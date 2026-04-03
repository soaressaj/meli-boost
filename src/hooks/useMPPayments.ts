import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mpApi } from "@/lib/mpApi";
import type { MPPayment, DateRange } from "@/types/mercadopago";

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function useMPPayments(dateRange: DateRange, userId: string | undefined) {
  const isToday =
    formatDate(dateRange.start) === formatDate(new Date()) &&
    formatDate(dateRange.end) === formatDate(new Date());

  return useQuery({
    queryKey: ['mp-payments', formatDate(dateRange.start), formatDate(dateRange.end), userId],
    queryFn: async (): Promise<MPPayment[]> => {
      if (!userId) return [];
      const token = await mpApi.getAccessToken(userId);
      if (!token) throw new Error('Token não disponível');
      return mpApi.fetchAllPayments(token, formatDate(dateRange.start), formatDate(dateRange.end));
    },
    enabled: !!userId,
    staleTime: isToday ? 5 * 60 * 1000 : 30 * 60 * 1000,
    refetchInterval: isToday ? 5 * 60 * 1000 : undefined,
  });
}

export function useMPConnection(userId: string | undefined) {
  return useQuery({
    queryKey: ['mp-connection', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('mp_connections')
        .select('id, user_id, mp_user_id, nickname, expires_at, created_at')
        .eq('user_id', userId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!userId,
  });
}
